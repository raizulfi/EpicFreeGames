import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface Config {
  // Epic Games Credentials (optional if using Firefox profile)
  epicEmail?: string;
  epicPassword?: string;

  // Firefox Profile Mode
  useFirefoxProfile: boolean;
  firefoxProfilePath?: string;

  // Browser Settings
  headless: boolean;
  screenshotOnError: boolean;
  screenshotOnSuccess: boolean;
  browserTimeout: number;

  // Retry Configuration
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logDir: string;

  // Notifications
  discordWebhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
  smtpTo?: string;

  // Advanced Options
  proxyUrl?: string;
  userAgent?: string;
  sessionDir: string;
  closeBrowserOnError: boolean;
  captchaTimeout: number;
}

export function getConfig(): Config {
  const useFirefoxProfile = process.env.USE_FIREFOX_PROFILE === 'true';
  const epicEmail = process.env.EPIC_EMAIL;
  const epicPassword = process.env.EPIC_PASSWORD;

  // Require credentials only if not using Firefox profile
  if (!useFirefoxProfile && (!epicEmail || !epicPassword)) {
    throw new Error('EPIC_EMAIL and EPIC_PASSWORD environment variables are required (or set USE_FIREFOX_PROFILE=true)');
  }

  return {
    epicEmail,
    epicPassword,
    useFirefoxProfile,
    firefoxProfilePath: process.env.FIREFOX_PROFILE_PATH,
    headless: process.env.HEADLESS !== 'false',
    screenshotOnError: process.env.SCREENSHOT_ON_ERROR === 'true',
    screenshotOnSuccess: process.env.SCREENSHOT_ON_SUCCESS === 'true',
    browserTimeout: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '2000', 10),
    exponentialBackoff: process.env.EXPONENTIAL_BACKOFF !== 'false',
    logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    logDir: process.env.LOG_DIR || './logs',
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpFrom: process.env.SMTP_FROM,
    smtpTo: process.env.SMTP_TO,
    proxyUrl: process.env.PROXY_URL,
    userAgent: process.env.USER_AGENT,
    sessionDir: process.env.SESSION_DIR || './sessions',
    closeBrowserOnError: process.env.CLOSE_BROWSER_ON_ERROR !== 'false',
    captchaTimeout: parseInt(process.env.CAPTCHA_TIMEOUT || '300000', 10),
  };
}
