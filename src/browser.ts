import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { Config } from './config';
import { getLogger } from './logger';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  constructor(private config: Config) {}

  async launch(): Promise<void> {
    const logger = getLogger();
    logger.info('Launching browser...');

    if (!fs.existsSync(this.config.sessionDir)) {
      fs.mkdirSync(this.config.sessionDir, { recursive: true });
    }

    this.browser = await chromium.launch({
      headless: this.config.headless,
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-infobars',
        '--disable-dev-shm-usage',
      ],
    });

    logger.info('Browser launched');
  }

  async createContext(): Promise<BrowserContext> {
    if (!this.browser) await this.launch();

    const logger = getLogger();
    const sessionFile = path.join(this.config.sessionDir, 'session.json');

    const contextOptions: any = {
      ignoreHTTPSErrors: true,
      locale: 'en-US',
    };

    if (fs.existsSync(sessionFile)) {
      logger.info('Loading existing session...');
      try {
        const state = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
        contextOptions.storageState = Array.isArray(state)
          ? { cookies: state, origins: [] }
          : state;
      } catch (err) {
        logger.warn('Failed to load session file, starting fresh: %s', err);
      }
    }

    this.context = await this.browser!.newContext(contextOptions);
    this.context.on('close', () => {
      this.context = null;
    });

    logger.info('Browser context created');
    return this.context;
  }

  async getPage(): Promise<Page> {
    if (!this.context) await this.createContext();

    const page = await this.context!.newPage();
    page.on('pageerror', (err) => getLogger().error('Page error: %s', err.message));
    return page;
  }

  async saveSession(): Promise<void> {
    if (!this.context) return;
    const logger = getLogger();
    try {
      const sessionFile = path.join(this.config.sessionDir, 'session.json');
      await this.context.storageState({ path: sessionFile });
      logger.info('Session saved to %s', sessionFile);
    } catch (err) {
      logger.error('Failed to save session: %s', err);
    }
  }

  async takeScreenshot(page: Page, name: string, type: 'success' | 'error'): Promise<void> {
    if (type === 'error' && !this.config.screenshotOnError) return;
    if (type === 'success') return; // only save error screenshots

    try {
      const dir = './screenshots';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const file = path.join(dir, `${name}-${ts}.png`);
      await page.screenshot({ path: file, fullPage: true });
      getLogger().info('Screenshot: %s', file);
    } catch (err) {
      getLogger().error('Screenshot failed: %s', err);
    }
  }

  async close(): Promise<void> {
    const logger = getLogger();
    await this.saveSession().catch(() => {});
    try {
      await this.context?.close();
    } catch {}
    try {
      await this.browser?.close();
    } catch {}
    logger.info('Browser closed');
  }
}
