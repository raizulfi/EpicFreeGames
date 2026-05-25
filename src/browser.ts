import { chromium, firefox, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { Config } from './config';
import { getLogger } from './logger';

export class BrowserManager {
  private browser: Browser | BrowserContext | null = null;
  private context: BrowserContext | null = null;
  private config: Config;
  private isFirefoxProfile = false;

  constructor(config: Config) {
    this.config = config;
  }

  async launch(): Promise<Browser | BrowserContext> {
    const logger = getLogger();
    logger.info('Launching browser...');

    if (!fs.existsSync(this.config.sessionDir)) {
      fs.mkdirSync(this.config.sessionDir, { recursive: true });
    }

    if (this.config.useFirefoxProfile) {
      logger.info('Using Firefox profile mode');
      const launchOptions: any = {
        headless: this.config.headless,
        timeout: this.config.browserTimeout,
      };

      if (!this.config.firefoxProfilePath) {
        throw new Error('FIREFOX_PROFILE_PATH is required when USE_FIREFOX_PROFILE=true');
      }

      if (!fs.existsSync(this.config.firefoxProfilePath)) {
        throw new Error(`Firefox profile path does not exist: ${this.config.firefoxProfilePath}`);
      }

      if (this.config.proxyUrl) {
        launchOptions.proxy = { server: this.config.proxyUrl };
      }

      this.browser = await firefox.launchPersistentContext(this.config.firefoxProfilePath, launchOptions);
      this.isFirefoxProfile = true;
      logger.info('Firefox persistent context launched with profile: %s', this.config.firefoxProfilePath);
    } else {
      logger.info('Using Chromium with session-based login');
      const launchOptions: any = {
        headless: this.config.headless,
        timeout: this.config.browserTimeout,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--start-maximized',
          '--disable-extensions',
        ],
      };

      if (this.config.proxyUrl) {
        launchOptions.proxy = { server: this.config.proxyUrl };
      }

      this.browser = await chromium.launch(launchOptions);
      logger.info('Chromium browser launched successfully');
    }

    return this.browser;
  }

  async createContext(): Promise<BrowserContext> {
    if (!this.browser) {
      await this.launch();
    }

    const logger = getLogger();

    // Firefox persistent context is already a context
    if (this.isFirefoxProfile) {
      this.context = this.browser as BrowserContext;
      logger.info('Using Firefox persistent context as browser context');
      return this.context;
    }

    const sessionFile = path.join(this.config.sessionDir, 'session.json');

    const contextOptions: any = {
      ignoreHTTPSErrors: true,
      userAgent: this.config.userAgent,
      locale: 'en-US',
    };

    if (fs.existsSync(sessionFile)) {
      logger.info('Loading existing session...');
      try {
        const cookies = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
        contextOptions.storageState = { cookies, origins: [] };
      } catch (err) {
        logger.warn('Failed to load session file, starting fresh: %s', err);
      }
    }

    this.context = await (this.browser as Browser).newContext(contextOptions);

    this.context.on('close', () => {
      logger.debug('Context closed');
      this.context = null;
    });

    logger.info('Browser context created');
    return this.context;
  }

  async getPage(): Promise<Page> {
    if (!this.context) {
      await this.createContext();
    }

    const page = await this.context!.newPage();

    page.on('console', (msg) => {
      getLogger().debug('Browser console [%s]: %s', msg.type(), msg.text());
    });

    page.on('pageerror', (err) => {
      getLogger().error('Page error: %s', err.message);
    });

    return page;
  }

  async saveSession(): Promise<void> {
    if (!this.context) {
      return;
    }

    const logger = getLogger();
    try {
      const cookies = await this.context.cookies();
      const sessionFile = path.join(this.config.sessionDir, 'session.json');
      fs.writeFileSync(sessionFile, JSON.stringify(cookies, null, 2));
      logger.info('Session saved to %s', sessionFile);
    } catch (err) {
      logger.error('Failed to save session: %s', err);
    }
  }

  async takeScreenshot(
    page: Page,
    name: string,
    type: 'success' | 'error'
  ): Promise<void> {
    const logger = getLogger();
    if (type === 'success' && !this.config.screenshotOnSuccess) {
      return;
    }
    if (type === 'error' && !this.config.screenshotOnError) {
      return;
    }

    try {
      const screenshotDir = './screenshots';
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.join(screenshotDir, `${type}-${name}-${timestamp}.png`);
      await page.screenshot({ path: filename, fullPage: true });
      logger.info('Screenshot saved: %s', filename);
    } catch (err) {
      logger.error('Failed to take screenshot: %s', err);
    }
  }

  async close(): Promise<void> {
    const logger = getLogger();

    // Only save session for Chromium mode, not Firefox profile mode
    if (!this.isFirefoxProfile) {
      try {
        await this.saveSession();
      } catch (err) {
        logger.error('Error saving session before closing: %s', err);
      }
    }

    // For Firefox persistent context, closing context also closes the browser
    if (this.isFirefoxProfile && this.context) {
      try {
        await this.context.close();
      } catch (err) {
        logger.error('Error closing Firefox context: %s', err);
      }
      this.browser = null;
      this.context = null;
    } else {
      if (this.context) {
        try {
          await this.context.close();
        } catch (err) {
          logger.error('Error closing context: %s', err);
        }
      }

      if (this.browser) {
        try {
          await (this.browser as Browser).close();
        } catch (err) {
          logger.error('Error closing browser: %s', err);
        }
      }
    }

    logger.info('Browser closed');
  }
}
