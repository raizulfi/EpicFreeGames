import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../config';
import { initLogger, getLogger } from '../logger';

async function main() {
  const config = getConfig();
  initLogger(config);
  const logger = getLogger();

  const sessionDir = config.sessionDir || './sessions';
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  logger.info('Opening browser for manual login...');
  logger.info('Log in to Epic Games in the window that opens, then close the browser when done.');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
  });

  const context = await browser.newContext({ locale: 'en-US' });

  const page = await context.newPage();
  await page.goto('https://www.epicgames.com/id/login/epic', { waitUntil: 'domcontentloaded' });

  logger.info('Waiting for you to log in (up to 5 minutes)...');

  // Wait until navigated away from any login URL, or browser is closed
  try {
    await page.waitForURL(
      (url) => !url.href.includes('/id/login') && !url.href.includes('/account/login'),
      { timeout: 300000 }
    );
    logger.info('Login detected! Saving session...');
  } catch {
    logger.warn('Timed out waiting for login. Saving whatever session exists...');
  }

  // Give the page a moment to settle (cookies, localStorage, etc.)
  await page.waitForTimeout(2000);

  // Save full storage state (cookies + localStorage) so the session fully restores
  const sessionFile = path.join(sessionDir, 'session.json');
  await context.storageState({ path: sessionFile });
  logger.info('Session saved to %s', sessionFile);

  await browser.close();
  logger.info('Done. Run "npm run claim" to claim free games.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
