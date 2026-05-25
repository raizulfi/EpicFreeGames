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
  private gameDetector = new GameDetector(this.browserManager);
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

      logger.info('Attempting login with credentials...');
      const loginResult = await this.authManager.login(this.config.epicEmail || '', this.config.epicPassword || '');

      if (!loginResult.success) {
        if (loginResult.requiresCaptcha) {
          logger.error('Login requires CAPTCHA. Please log in manually and resolve the CAPTCHA.');
          await this.notificationManager.sendNotifications({
            title: 'Epic Games Claimer - CAPTCHA Required',
            description: 'Please log in manually and resolve the CAPTCHA on the Epic Games login page.',
            type: 'error',
          });
          summary.requiresCaptcha = 1;
        } else {
          logger.error('Login failed: %s', loginResult.message);
          await this.notificationManager.sendNotifications({
            title: 'Epic Games Claimer - Login Failed',
            description: loginResult.message,
            type: 'error',
          });
        }
        return summary;
      }

      logger.info('Login successful');

      logger.info('Detecting free games...');
      let games = [];
      try {
        games = await this.gameDetector.detectFreeGames();
      } catch (detectErr) {
        logger.error('Failed to detect games: %s', detectErr);
        throw detectErr;
      }
      summary.totalGames = games.length;

      if (games.length === 0) {
        logger.info('No free games available to claim');
        return summary;
      }

      logger.info('Claiming %d games...', games.length);
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
          successfulGames.push(result.gameName);
          if (result.alreadyOwned) {
            summary.alreadyOwned++;
            alreadyOwnedGames.push(result.gameName);
          }
        } else if (result.requiresCaptcha) {
          summary.requiresCaptcha++;
        } else {
          summary.failed++;
          failedGames.push(`${result.gameName} (${result.message})`);
        }
      }

      const notificationSummary = [
        `Successfully claimed: ${summary.successfullyClaimed - summary.alreadyOwned}`,
        `Already owned: ${summary.alreadyOwned}`,
        `Failed: ${summary.failed}`,
        `CAPTCHA required: ${summary.requiresCaptcha}`,
      ].join('\n');

      logger.info('Claim Summary:\n%s', notificationSummary);

      await this.notificationManager.sendNotifications({
        title: 'Epic Games Claimer - Session Complete',
        description: notificationSummary,
        type: successfulGames.length > 0 ? 'success' : 'info',
        games: successfulGames.length > 0 ? successfulGames : undefined,
      });

      return summary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Critical error during claim process: %s', errorMessage);

      await this.notificationManager.sendNotifications({
        title: 'Epic Games Claimer - Critical Error',
        description: errorMessage,
        type: 'error',
      });

      throw err;
    } finally {
      try {
        await this.browserManager.close();
      } catch (err) {
        logger.error('Error closing browser: %s', err);
      }
    }
  }

  async login(): Promise<void> {
    const logger = getLogger();
    logger.info('=== Epic Games Login Started ===');

    try {
      await this.browserManager.launch();

      const loginResult = await this.authManager.login(this.config.epicEmail || '', this.config.epicPassword || '');

      if (loginResult.success) {
        logger.info('Login successful');
      } else {
        logger.error('Login failed: %s', loginResult.message);
      }
    } finally {
      try {
        await this.browserManager.close();
      } catch (err) {
        logger.error('Error closing browser: %s', err);
      }
    }
  }
}

export default EpicGamesClaimer;
