import { getLogger } from './logger';
import { BrowserManager } from './browser';
import { FreeGame } from './gameDetector';

export interface ClaimResult {
  gameName: string;
  success: boolean;
  message: string;
  alreadyOwned?: boolean;
  requiresCaptcha?: boolean;
  retryable?: boolean;
}

export class GameClaimer {
  constructor(private browserManager: BrowserManager) {}

  async claimGames(
    games: FreeGame[],
    maxRetries: number,
    retryDelayMs: number
  ): Promise<ClaimResult[]> {
    const logger = getLogger();
    logger.info('Starting to claim %d game(s)', games.length);
    const results: ClaimResult[] = [];
    for (const game of games) {
      results.push(await this.claimWithRetry(game, maxRetries, retryDelayMs));
    }
    return results;
  }

  private async claimWithRetry(
    game: FreeGame,
    maxRetries: number,
    retryDelayMs: number
  ): Promise<ClaimResult> {
    const logger = getLogger();
    let lastResult: ClaimResult | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info('Claiming "%s" (attempt %d/%d)', game.name, attempt, maxRetries);
        const result = await this.claimGame(game);

        if (result.success || result.requiresCaptcha || !result.retryable) {
          return result;
        }

        lastResult = result;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * retryDelayMs;
          logger.debug('Retrying in %dms...', delay);
          await this.sleep(delay);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('Unexpected error claiming "%s": %s', game.name, msg);
        lastResult = { gameName: game.name, success: false, message: msg, retryable: true };
        if (attempt < maxRetries) {
          await this.sleep(Math.pow(2, attempt - 1) * retryDelayMs);
        }
      }
    }

    return (
      lastResult ?? {
        gameName: game.name,
        success: false,
        message: 'Max retries exceeded',
        retryable: false,
      }
    );
  }

  private async claimGame(game: FreeGame): Promise<ClaimResult> {
    const logger = getLogger();
    const page = await this.browserManager.getPage();

    try {
      await page.goto(game.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await this.browserManager.takeScreenshot(page, `game-${game.name}`, 'success');

      if (
        await page
          .locator('iframe[title*="reCAPTCHA"]')
          .isVisible({ timeout: 2000 })
          .catch(() => false)
      ) {
        return {
          gameName: game.name,
          success: false,
          message: 'CAPTCHA required',
          requiresCaptcha: true,
        };
      }

      if (
        await page
          .locator('text=/already own|in your library|in library|you own this/i')
          .isVisible({ timeout: 2000 })
          .catch(() => false)
      ) {
        logger.info('Already owned: %s', game.name);
        return { gameName: game.name, success: true, message: 'Already owned', alreadyOwned: true };
      }

      // Scroll down a bit so lazy-rendered buttons become visible
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(1500);

      const getBtn = page
        .locator(
          [
            'button:has-text("Get")',
            'button:has-text("Claim")',
            'button:has-text("Free")',
            'button:has-text("Add to Library")',
            '[data-component="DownloadButton"] button',
            '[data-testid*="purchase"] button',
            '[data-testid*="buy"] button',
            '[class*="PurchaseButton"] button',
            '[class*="purchase-button"]',
            'button[class*="cta"]',
          ].join(', ')
        )
        .first();

      if (!(await getBtn.isVisible({ timeout: 10000 }).catch(() => false))) {
        logger.warn('No Get/Claim button found for "%s"', game.name);
        await this.browserManager.takeScreenshot(page, `no-button-${game.name}`, 'error');
        return {
          gameName: game.name,
          success: false,
          message: 'Get button not found',
          retryable: true,
        };
      }

      await getBtn.click();
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(2000);

      // "Add to Library" may appear inline or inside Epic's checkout iframe
      const addSelector =
        'button:has-text("Add to Library"), button:has-text("Add to library")';
      const addBtn = page.locator(addSelector).first();
      const addBtnInFrame = page.frameLocator('iframe').locator(addSelector).first();

      if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addBtn.click();
        logger.debug('Clicked "Add to Library"');
      } else if (await addBtnInFrame.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtnInFrame.click();
        logger.debug('Clicked "Add to Library" inside iframe');
      }

      // Wait for checkout flow to settle (iframe close triggers a page state change)
      await page.waitForTimeout(2000);

      // Handle any confirmation modal
      const modal = page.locator('[role="dialog"], [class*="Modal"]').first();
      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        const confirmBtn = modal
          .locator(
            'button:has-text("Confirm"), button:has-text("Agree"), ' +
              'button:has-text("Accept"), button:has-text("OK"), ' +
              'button:has-text("Add to Library")'
          )
          .first();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
        }
      }

      // Give Epic time to process and update the page state
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(3000);

      // Positive success signals — any one is enough
      const successSelectors = [
        'text=/successfully claimed|added to (your )?library|order confirmed|thank you/i',
        'button:has-text("Download")',
        'button:has-text("Open")',
        'text=/in your library/i',
        'text=/you own this/i',
        '[class*="owned"]',
        '[class*="inLibrary"]',
      ];

      for (const sel of successSelectors) {
        if (await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false)) {
          logger.info('Claimed: %s', game.name);
          return { gameName: game.name, success: true, message: 'Claimed successfully' };
        }
      }

      // Fallback: if the Get/Free button is truly gone, the claim went through
      const getStillThere = await page
        .locator('button:has-text("Get"), button:has-text("Claim"), button:has-text("Free")')
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!getStillThere) {
        logger.info('Claimed: %s (purchase button gone)', game.name);
        return { gameName: game.name, success: true, message: 'Claimed successfully' };
      }

      await this.browserManager.takeScreenshot(page, `claim-failed-${game.name}`, 'error');
      return {
        gameName: game.name,
        success: false,
        message: 'Claim did not complete — button still present',
        retryable: true,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Error claiming "%s": %s', game.name, msg);
      await this.browserManager.takeScreenshot(page, `error-${game.name}`, 'error');
      return { gameName: game.name, success: false, message: msg, retryable: true };
    } finally {
      await page.close();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
