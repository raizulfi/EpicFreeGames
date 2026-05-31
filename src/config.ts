import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  epicEmail?: string;
  epicPassword?: string;
  discordWebhookUrl?: string;
  headless: boolean;
  screenshotOnError: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  sessionDir: string;
  maxRetries: number;
  retryDelayMs: number;
}

export function getConfig(): Config {
  const epicEmail = process.env.EPIC_EMAIL;
  const epicPassword = process.env.EPIC_PASSWORD;

  if (!epicEmail || !epicPassword) {
    throw new Error('EPIC_EMAIL and EPIC_PASSWORD must be set in .env');
  }

  return {
    epicEmail,
    epicPassword,
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
    headless: process.env.HEADLESS !== 'false',
    screenshotOnError: process.env.SCREENSHOT_ON_ERROR !== 'false',
    logLevel: (process.env.LOG_LEVEL || 'info') as Config['logLevel'],
    sessionDir: './sessions',
    maxRetries: 3,
    retryDelayMs: 2000,
  };
}
