import { Page } from 'playwright';
import { getLogger } from './logger';
import { BrowserManager } from './browser';
import { Config } from './config';

export interface LoginResult {
  success: boolean;
  message: string;
  requiresCaptcha?: boolean;
}

export class AuthManager {
  constructor(private browserManager: BrowserManager, private config: Config) {}

  async verifySession(): Promise<boolean> {
    const logger = getLogger();
    const page = await this.browserManager.getPage();
    try {
      await page.goto('https://www.epicgames.com/store/en-US/', {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      const loggedIn = await this.isLoggedIn(page);
      logger.info('Session valid: %s', loggedIn);
      return loggedIn;
    } catch (err) {
      logger.warn('Session verification failed: %s', err);
      return false;
    } finally {
      await page.close();
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const logger = getLogger();

    const page = await this.browserManager.getPage();
    try {
      logger.info('Starting Epic Games login...');
      // Go directly to the email/password form, bypassing the login-method picker
      await page.goto('https://www.epicgames.com/id/login/epic', {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);

      // Dismiss cookie consent if present
      const cookieBtn = page.locator(
        'button:has-text("Accept All"), button:has-text("Accept"), button[id*="accept"]'
      );
      if (await cookieBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await cookieBtn.first().click().catch(() => {});
        await page.waitForTimeout(1000);
      }

      await this.browserManager.takeScreenshot(page, 'login-page', 'success');

      const emailSelector = 'input[id="email"], input[name="email"], input[type="email"]';
      const emailHandle = await page
        .waitForSelector(emailSelector, { state: 'visible', timeout: 15000 })
        .catch(() => null);

      if (!emailHandle) {
        const currentUrl = page.url();
        if (!currentUrl.includes('/id/login') && !currentUrl.includes('/account/login')) {
          logger.info('Already redirected away from login — session is valid');
          return { success: true, message: 'Already logged in' };
        }
        await this.browserManager.takeScreenshot(page, 'login-form-missing', 'error');
        return { success: false, message: 'Login form not found' };
      }

      const emailInput = page.locator(emailSelector).first();
      const passwordInput = page
        .locator('input[id="password"], input[name="password"], input[type="password"]')
        .first();

      // Readonly email means the session cookie pre-filled the form — already logged in
      if (await emailInput.evaluate((el: any) => el.readOnly)) {
        logger.info('Email field is readonly — already logged in via session');
        return { success: true, message: 'Already logged in via session' };
      }

      await emailInput.fill(email);
      await passwordInput.fill(password);
      logger.debug('Filled login credentials');

      const loginButton = page.locator('button[type="submit"]').first();
      await loginButton.scrollIntoViewIfNeeded();
      await loginButton.click();
      logger.debug('Clicked login button');

      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(3000);

      logger.debug('URL after login: %s', page.url());

      // CAPTCHA check
      if (
        await page
          .locator('iframe[title*="reCAPTCHA"], [class*="g-recaptcha"]')
          .isVisible({ timeout: 2000 })
          .catch(() => false)
      ) {
        logger.warn('CAPTCHA detected');
        return { success: false, message: 'CAPTCHA required', requiresCaptcha: true };
      }

      // 2FA check
      const mfaLocator = page.locator(
        'text=/verification code/i, text=/authenticator/i, text=/2fa/i, [class*="mfa"], [class*="2fa"]'
      );
      if (await mfaLocator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        logger.warn('2FA/MFA required — manual intervention needed');
        return { success: false, message: '2FA/MFA required', requiresCaptcha: true };
      }

      // Wait for any loading spinner to clear
      await page
        .waitForFunction(
          () =>
            !document.querySelector('[class*="spinner"]') &&
            !document.querySelector('[class*="loading"]'),
          { timeout: 15000 }
        )
        .catch(() => {});

      // Check for explicit login errors
      const errorLocator = page.locator(
        'text=/invalid email or password/i, text=/too many login attempts/i, [role="alert"]'
      );
      if (await errorLocator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        const errorText = await errorLocator.first().textContent().catch(() => 'unknown error');
        logger.error('Login error: %s', errorText);
        return { success: false, message: `Login failed: ${errorText}` };
      }

      // Verify by loading the store
      await page
        .goto('https://www.epicgames.com/store/en-US/free-games', {
          waitUntil: 'networkidle',
          timeout: 30000,
        })
        .catch(() => {});
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      const pageContent = await page.content();
      if (!currentUrl.includes('login') && pageContent.length > 10000) {
        logger.info('Login successful');
        await this.browserManager.saveSession();
        return { success: true, message: 'Login successful' };
      }

      logger.warn('Could not confirm login success');
      return { success: false, message: 'Login confirmation failed' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Login error: %s', msg);
      await this.browserManager.takeScreenshot(page, 'login-error', 'error');
      return { success: false, message: `Login error: ${msg}` };
    } finally {
      await page.close();
    }
  }

  private async isLoggedIn(page: Page): Promise<boolean> {
    // Logged-in pages have an account/profile nav element; login pages redirect back to /id/login
    const url = page.url();
    if (url.includes('/id/login') || url.includes('/account/login')) return false;
    const accountEl = page.locator(
      'a[href*="/account"], [class*="account"], [class*="userAvatar"], [aria-label*="account" i]'
    );
    return accountEl.first().isVisible({ timeout: 3000 }).catch(() => false);
  }
}
