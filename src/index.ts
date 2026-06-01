import fs from 'fs';
import path from 'path';
import { BrowserManager } from './browser';
import { AuthManager } from './auth';
import { GameDetector } from './gameDetector';
import { GameClaimer } from './gameClaimer';
import { NotificationManager } from './notifications';
import { getConfig } from './config';
import { initLogger, getLogger } from './logger';

export interface ClaimSummary {
  totalGames: number;
  successfullyClaimed: number;
  alreadyOwned: number;
  failed: number;
  requiresCaptcha: number;
}

export class EpicGamesClaimer {
  private config = getConfig();
  private logger = initLogger(this.config);
  private browserManager = new BrowserManager(this.config);
  private authManager = new AuthManager(this.browserManager, this.config);
  private gameDetector = new GameDetector();
  private gameClaimer = new GameClaimer(this.browserManager);
  private notificationManager = new NotificationManager(this.config);

  async claim(): Promise<ClaimSummary> {
    const logger = getLogger();
    logger.info('=== Epic Games Free Games Claimer Started ===');

    const summary: ClaimSummary = {
      totalGames: 0,
      successfullyClaimed: 0,
      alreadyOwned: 0,
      failed: 0,
      requiresCaptcha: 0,
    };

    try {
      await this.browserManager.launch();

      const sessionFile = path.join(this.config.sessionDir, 'session.json');
      const hasSession = fs.existsSync(sessionFile);

      let loginResult;
      if (hasSession) {
        logger.info('Session file found — using saved session');
        loginResult = { success: true, message: 'Using saved session' };
      } else {
        loginResult = { success: false, message: 'No session found. Run "npm run manual-login" first.', requiresCaptcha: false };
      }

      if (!loginResult.success) {
        if (loginResult.requiresCaptcha) {
          logger.error('Login requires manual intervention (CAPTCHA/2FA). Run "npm run manual-login" first.');
          await this.notificationManager.sendNotifications({
            title: 'Epic Games Claimer — Action Required',
            description: 'CAPTCHA or 2FA detected. Run "npm run manual-login" to authenticate.',
            type: 'error',
          });
          summary.requiresCaptcha = 1;
        } else {
          logger.error('Login failed: %s', loginResult.message);
          await this.notificationManager.sendNotifications({
            title: 'Epic Games Claimer — Login Failed',
            description: loginResult.message,
            type: 'error',
          });
        }
        return summary;
      }

      logger.info('Authenticated — detecting free games...');

      let games = [];
      try {
        games = await this.gameDetector.detectFreeGames();
      } catch (err) {
        logger.error('Failed to detect games: %s', err);
        throw err;
      }
      summary.totalGames = games.length;

      if (games.length === 0) {
        logger.info('No free games available to claim this week');
        return summary;
      }

      logger.info('Claiming %d game(s)...', games.length);
      const results = await this.gameClaimer.claimGames(
        games,
        this.config.maxRetries,
        this.config.retryDelayMs
      );

      const successfulGames: string[] = [];
      const alreadyOwnedGames: string[] = [];
      const failedGames: string[] = [];

      for (const result of results) {
        if (result.success) {
          summary.successfullyClaimed++;
          if (result.alreadyOwned) {
            summary.alreadyOwned++;
            alreadyOwnedGames.push(result.gameName);
          } else {
            successfulGames.push(result.gameName);
          }
        } else if (result.requiresCaptcha) {
          summary.requiresCaptcha++;
        } else {
          summary.failed++;
          failedGames.push(`${result.gameName} (${result.message})`);
        }
      }

      const notificationBody = [
        `Claimed: ${successfulGames.length}`,
        `Already owned: ${summary.alreadyOwned}`,
        `Failed: ${summary.failed}`,
        summary.requiresCaptcha > 0 ? `CAPTCHA required: ${summary.requiresCaptcha}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      logger.info('Summary:\n%s', notificationBody);

      await this.notificationManager.sendNotifications({
        title: 'Epic Games Claimer — Session Complete',
        description: notificationBody,
        type: successfulGames.length > 0 ? 'success' : 'info',
        games: successfulGames.length > 0 ? successfulGames : undefined,
      });

      return summary;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Critical error: %s', msg);
      await this.notificationManager.sendNotifications({
        title: 'Epic Games Claimer — Critical Error',
        description: msg,
        type: 'error',
      });
      throw err;
    } finally {
      await this.browserManager.close().catch(() => {});
    }
  }

  async login(): Promise<void> {
    const logger = getLogger();
    logger.info('=== Epic Games Login Started ===');
    try {
      await this.browserManager.launch();
      const result = await this.authManager.login(
        this.config.epicEmail || '',
        this.config.epicPassword || ''
      );
      if (result.success) {
        logger.info('Login successful');
      } else {
        logger.error('Login failed: %s', result.message);
      }
    } finally {
      await this.browserManager.close().catch(() => {});
    }
  }
}

export default EpicGamesClaimer;
