import { Page } from 'playwright';
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
  private browserManager: BrowserManager;
  private retryCount: Map<string, number> = new Map();

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager;
  }

  async claimGames(games: FreeGame[], maxRetries: number, retryDelayMs: number): Promise<ClaimResult[]> {
    const logger = getLogger();
    const results: ClaimResult[] = [];

    logger.info('Starting to claim %d games', games.length);

    for (const game of games) {
      const result = await this.claimGameWithRetry(game, maxRetries, retryDelayMs);
      results.push(result);

      if (!result.success && !result.requiresCaptcha) {
        await this.delay(retryDelayMs);
      }
    }

    return results;
  }

  private async claimGameWithRetry(
    game: FreeGame,
    maxRetries: number,
    retryDelayMs: number
  ): Promise<ClaimResult> {
    const logger = getLogger();
    let lastError: ClaimResult | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info('Attempting to claim: %s (attempt %d/%d)', game.name, attempt, maxRetries);

        const result = await this.claimGame(game);

        if (result.success) {
          logger.info('Successfully claimed: %s', game.name);
          this.retryCount.delete(game.name);
          return result;
        }

        if (result.requiresCaptcha) {
          logger.warn('CAPTCHA required for %s', game.name);
          return result;
        }

        if (!result.retryable) {
          logger.warn('Game claim not retryable: %s - %s', game.name, result.message);
          return result;
        }

        lastError = result;
        logger.debug('Claim failed, will retry: %s', result.message);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * retryDelayMs;
          logger.debug('Waiting %dms before retry...', delay);
          await this.delay(delay);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error('Unexpected error claiming %s: %s', game.name, errorMessage);
        lastError = {
          gameName: game.name,
          success: false,
          message: `Error: ${errorMessage}`,
          retryable: true,
        };

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * retryDelayMs;
          await this.delay(delay);
        }
      }
    }

    return (
      lastError || {
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
      logger.debug('Navigating to game: %s', game.url);
      await page.goto(game.url, { waitUntil: 'domcontentloaded', timeout: 45000 });

      await this.browserManager.takeScreenshot(page, `game-${game.name}`, 'success');

      await page.waitForTimeout(2000);

      const captchaFrame = page.locator('iframe[title*="reCAPTCHA"]');
      if (await captchaFrame.isVisible({ timeout: 2000 }).catch(() => false)) {
        logger.warn('CAPTCHA detected on game page for %s', game.name);
        return { gameName: game.name, success: false, message: 'CAPTCHA required', requiresCaptcha: true };
      }

      const alreadyOwnedBadge = page.locator(
        'text=/already own|already in your library|in library|you own this/i'
      );
      if (await alreadyOwnedBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        logger.info('Game already owned: %s', game.name);
        return {
          gameName: game.name,
          success: true,
          message: 'Already owned',
          alreadyOwned: true,
        };
      }

      // Try multiple selectors for Get/Claim button - Epic loves changing them
      const getButton = page.locator(
        'button:has-text("Get"), ' +
        'button:has-text("Claim"), ' +
        'a:has-text("Get"), ' +
        'a:has-text("Claim"), ' +
        '[class*="PurchaseButton"] button, ' +
        'button[class*="purchase"]'
      );

      const isVisible = await getButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (!isVisible) {
        logger.warn('Get/Claim button not found for %s', game.name);
        return {
          gameName: game.name,
          success: false,
          message: 'Get button not found',
          retryable: true,
        };
      }

      logger.debug('Clicking Get/Claim button for %s', game.name);
      await getButton.first().click();

      await page.waitForTimeout(3000);

      // Wait for any page changes/navigation
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(2000);

      // Check for iframe first (Epic uses iframes for checkout)
      let addToLibraryFound = false;
      
      const iframes = page.locator('iframe');
      const iframeCount = await iframes.count();
      
      if (iframeCount > 0) {
        logger.debug('Found %d iframes on page, searching for "Add to library" button', iframeCount);
        
        for (let i = 0; i < iframeCount; i++) {
          try {
            const frameLocator = page.frameLocator(`iframe:nth-of-type(${i + 1})`);
            const iframeButton = frameLocator.locator('button:has(span:has-text("Add to library")), button:has-text("Add to library")');
            
            if (await iframeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              logger.debug('Found "Add to library" button in iframe %d', i + 1);
              await iframeButton.first().click();
              logger.info('Clicked "Add to library" button in iframe for %s', game.name);
              addToLibraryFound = true;
              await page.waitForTimeout(4000);
              break;
            }
          } catch (e) {
            logger.debug('Error checking iframe %d: %s', i + 1, e);
          }
        }
      }

      // If not in iframe, try regular selectors
      if (!addToLibraryFound) {
        logger.debug('Button not found in iframes, trying regular page selectors...');
        
        const addButtonSelectors = [
          'button:has(span:has-text("Add to library"))',
          'button:has-text("Add to library")',
          'button:has-text("Add to Library")',
          'button[class*="add"]',
          'a:has-text("Add to library")',
        ];

        for (const selector of addButtonSelectors) {
          const btn = page.locator(selector);
          if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
            logger.debug('Found "Add to library" button with selector: %s', selector);
            try {
              await btn.first().click();
              logger.info('Clicked "Add to library" button for %s', game.name);
              addToLibraryFound = true;
              await page.waitForTimeout(4000);
              break;
            } catch (e) {
              logger.debug('Failed to click button: %s', e);
            }
          }
        }
      }

      if (!addToLibraryFound) {
        logger.debug('No "Add to library" button found, checking page content...');
        const pageText = await page.content().catch(() => '');
        if (pageText.toLowerCase().includes('checkout') || pageText.toLowerCase().includes('add to library')) {
          logger.debug('Checkout page detected but button not clickable');
        }
      }

      // Check for modal/popup that requires confirmation
      const popupOrModal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
      if (await popupOrModal.isVisible({ timeout: 3000 }).catch(() => false)) {
        logger.debug('Modal appeared, looking for confirm button...');
        const confirmButton = popupOrModal.locator(
          'button:has-text("Confirm"), ' +
          'button:has-text("Agree"), ' +
          'button:has-text("Accept"), ' +
          'button:has-text("OK"), ' +
          'button:has-text("Add to library")'
        );

        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.first().click();
          logger.debug('Clicked confirm button');
          await page.waitForTimeout(4000);
        }
      }

      // Wait for success indicators
      await page.waitForTimeout(2000);

      const successMessages = [
        page.locator('text=/successfully claimed|added to your library|placed in your library/i'),
        page.locator('[class*="success"]'),
        page.locator('text=/order confirmed/i'),
      ];

      for (const successElement of successMessages) {
        if (await successElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          const successText = await successElement.textContent();
          logger.info('Claim successful for %s: %s', game.name, successText);
          return {
            gameName: game.name,
            success: true,
            message: 'Claimed successfully',
          };
        }
      }

      // Check if Get button is gone (indicates claimed)
      const newGetButton = page.locator('button:has-text("Get"), button:has-text("Claim")');
      if (await newGetButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        logger.warn('Get button still visible after click for %s, retrying...', game.name);
        return {
          gameName: game.name,
          success: false,
          message: 'Get button still visible after click',
          retryable: true,
        };
      }

      logger.info('Claim likely successful for %s (no button found)', game.name);
      return {
        gameName: game.name,
        success: true,
        message: 'Claimed (confirmed by absence of button)',
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Error claiming game %s: %s', game.name, errorMessage);
      await this.browserManager.takeScreenshot(page, `error-${game.name}`, 'error');

      return {
        gameName: game.name,
        success: false,
        message: `Error: ${errorMessage}`,
        retryable: true,
      };
    } finally {
      await page.close();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
