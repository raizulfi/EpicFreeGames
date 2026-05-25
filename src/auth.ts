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
  private browserManager: BrowserManager;
  private config: Config;

  constructor(browserManager: BrowserManager, config: Config) {
    this.browserManager = browserManager;
    this.config = config;
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const logger = getLogger();

    // Skip login if using Firefox profile mode - assume already logged in
    if (this.config.useFirefoxProfile) {
      logger.info('Firefox profile mode enabled - skipping password login, verifying session...');
      const page = await this.browserManager.getPage();
      try {
        await page.goto('https://www.epicgames.com/store/en-US/free-games', { waitUntil: 'networkidle' });
        const loggedIn = await this.checkLogin(page);
        
        if (loggedIn) {
          logger.info('Firefox session verified - user is logged in');
          return { success: true, message: 'Firefox session verified - already logged in' };
        } else {
          logger.error('Firefox session not valid - user may not be logged in to Epic Games');
          return { success: false, message: 'Firefox session not valid - please log in manually in Firefox first' };
        }
      } finally {
        await page.close();
      }
    }

    const page = await this.browserManager.getPage();

    try {
      logger.info('Starting Epic Games login...');
      await page.goto('https://www.epicgames.com/account/login', { waitUntil: 'domcontentloaded' });

      // Wait for page to fully render
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      await this.browserManager.takeScreenshot(page, 'login-page', 'success');

      const emailInput = page.locator('input[id="email"]');
      const passwordInput = page.locator('input[id="password"]');
      const loginButton = page.locator('button[type="submit"]');

      const emailExists = await emailInput.isVisible({ timeout: 10000 }).catch(() => false);

      if (!emailExists) {
        logger.warn('Email input not found, checking for already logged in state...');
        const logoutButton = page.locator('button:has-text("Logout")');
        if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          logger.info('Already logged in');
          return { success: true, message: 'Already logged in' };
        }
        return { success: false, message: 'Login form not found' };
      }

      // Check if email input is readonly (session already loaded)
      const isReadonly = await emailInput.evaluate((el: any) => el.readOnly);
      if (isReadonly) {
        logger.info('Email field is readonly - session already loaded, user is logged in');
        return { success: true, message: 'Already logged in via session' };
      }

      await emailInput.fill(email);
      await passwordInput.fill(password);

      logger.debug('Filled login credentials');

      // Make sure the button is in view and clickable before clicking
      await loginButton.scrollIntoViewIfNeeded();
      
      // Use type 'submit' form submission instead of just click
      await loginButton.press('Enter');
      logger.debug('Pressed Enter on login button');

      // Wait for navigation or form submission
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
      } catch (e) {
        logger.debug('No navigation detected after Enter');
      }

      // Wait a bit more for page to respond
      await page.waitForTimeout(4000);

      logger.debug('Current URL after sign in: %s', page.url());

      const captchaDetected = await page
        .locator('iframe[title*="reCAPTCHA"], [class*="g-recaptcha"]')
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (captchaDetected) {
        logger.warn('CAPTCHA detected on login page');
        return { success: false, message: 'CAPTCHA required', requiresCaptcha: true };
      }

      // Check for 2FA/MFA
      const mfaIndicators = [
        page.locator('text=/verification code/i'),
        page.locator('text=/authenticator/i'),
        page.locator('text=/2fa/i'),
        page.locator('[class*="mfa"], [class*="2fa"]'),
      ];

      for (const indicator of mfaIndicators) {
        if (await indicator.isVisible({ timeout: 1000 }).catch(() => false)) {
          logger.warn('2FA/MFA required - manual intervention needed');
          return { success: false, message: '2FA/MFA required', requiresCaptcha: true };
        }
      }

      const loadingSpinner = page.locator('[class*="spinner"], [class*="loading"]');
      try {
        await page.waitForFunction(() => {
          return !document.querySelector('[class*="spinner"]') && !document.querySelector('[class*="loading"]');
        }, { timeout: 30000 });
      } catch {
        logger.debug('Timeout waiting for loading to complete');
      }

      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);

      const errorMessages = [
        page.locator('text=/Invalid email or password/i'),
        page.locator('text=/too many login attempts/i'),
        page.locator('[role="alert"]'),
      ];

      for (const errorElement of errorMessages) {
        if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          const errorText = await errorElement.textContent();
          logger.error('Login error: %s', errorText);
          return { success: false, message: `Login failed: ${errorText}` };
        }
      }

      // Try to navigate to free games page to verify login worked
      try {
        logger.debug('Verifying login by navigating to free games page...');
        await page.goto('https://www.epicgames.com/store/en-US/free-games', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Check if we're actually logged in by looking at the page content
        const pageContent = await page.content();
        
        // Look for logged-in indicators on the free games page
        const logoutButton = await page.locator('button:has-text("Log Out"), [class*="logout"]').isVisible({ timeout: 2000 }).catch(() => false);
        const userMenu = await page.locator('[class*="user"], [class*="profile"], [class*="account"]').isVisible({ timeout: 2000 }).catch(() => false);
        const claimableGames = await page.locator('button:has-text("Claim"), [class*="claim"]').isVisible({ timeout: 2000 }).catch(() => false);
        
        logger.debug('Logout button visible: %s', logoutButton);
        logger.debug('User menu visible: %s', userMenu);
        logger.debug('Claimable games visible: %s', claimableGames);
        
        if (logoutButton || claimableGames) {
          logger.info('Login successful - verified by logout button or claimable games');
          await this.browserManager.saveSession();
          return { success: true, message: 'Login successful' };
        }
        
        // Alternative: check page title or URL
        const currentUrl = page.url();
        logger.debug('Current URL: %s', currentUrl);
        
        if (!currentUrl.includes('login') && pageContent.length > 10000) {
          logger.info('Login successful - URL changed from login page');
          await this.browserManager.saveSession();
          return { success: true, message: 'Login successful' };
        }
      } catch (navError) {
        logger.debug('Navigation error during verification: %s', navError);
      }

      logger.warn('Could not confirm login success');
      return { success: false, message: 'Login confirmation failed' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Login error: %s', errorMessage);
      await this.browserManager.takeScreenshot(page, 'login-error', 'error');
      return { success: false, message: `Login error: ${errorMessage}` };
    } finally {
      await page.close();
    }
  }

  async checkLogin(page: Page): Promise<boolean> {
    try {
      const accountLink = page.locator('a[href*="/account"]');
      return await accountLink.isVisible({ timeout: 3000 }).catch(() => false);
    } catch {
      return false;
    }
  }
}
