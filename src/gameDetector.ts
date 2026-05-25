import { Page } from 'playwright';
import { getLogger } from './logger';
import { BrowserManager } from './browser';

export interface FreeGame {
  name: string;
  url: string;
  alreadyOwned: boolean;
}

export class GameDetector {
  private browserManager: BrowserManager;

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager;
  }

  async detectFreeGames(): Promise<FreeGame[]> {
    const logger = getLogger();
    const page = await this.browserManager.getPage();

    try {
      logger.info('Detecting free games on Epic Games Store...');
      logger.debug('Navigating to free games page...');
      // Use /en-US/store instead of /store/en-US for consistency
      await page.goto('https://www.epicgames.com/store/en-US/free-games', {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      
      logger.debug('Free games page loaded, taking screenshot...');
      await this.browserManager.takeScreenshot(page, 'free-games-page', 'success');

      const games: FreeGame[] = [];

      // Wait for games to load
      logger.debug('Waiting for game cards to render...');
      await page.waitForTimeout(4000);

      // Multiple selectors to find game cards - Epic loves changing their selectors
      const allLinks = await page.locator('a').all();
      logger.debug('Found %d total links on page', allLinks.length);

      const gameElements: any[] = [];
      for (const link of allLinks) {
        const href = await link.getAttribute('href').catch(() => null);
        // Game links are like /p/xxx
        if (href && (href.includes('/p/') || href.includes('/store/')) && !href.includes('/free-games')) {
          if (!gameElements.find((el: any) => el === link)) {
            gameElements.push(link);
          }
        }
      }

      logger.debug('Found %d potential game cards', gameElements.length);

      for (let i = 0; i < gameElements.length; i++) {
        try {
          const element = gameElements[i];

          // Get the href from the card link
          const href = await element.getAttribute('href').catch(() => null);
          
          if (!href || !href.includes('/p/')) {
            continue;
          }

          // Extract game name from title, data attribute, or text
          let gameName = await element.getAttribute('title').catch(() => null) ||
                        await element.getAttribute('aria-label').catch(() => null);
          
          if (!gameName) {
            const parent = await element.evaluate((el: any) => {
              let p = el.closest('[class*="Card"]');
              return p ? p.textContent : null;
            });
            gameName = parent ? parent.substring(0, 50) : null;
          }

          if (!gameName) {
            gameName = href.split('/').pop() || `game${i}`;
          }

          const gameUrl = href.startsWith('http') ? href : `https://www.epicgames.com${href}`;

          // Check if already owned by looking for "owned" text in card
          const cardText = await element.evaluate((el: any) => {
            const card = el.closest('[class*="Card"]');
            return card ? card.textContent : '';
          });
          
          const alreadyOwned = (cardText && (
            cardText.toLowerCase().includes('own') || 
            cardText.toLowerCase().includes('in library') ||
            cardText.toLowerCase().includes('library')
          )) || false;

          if (!alreadyOwned && gameUrl && gameName && gameName.toLowerCase() !== 'unknown') {
            games.push({
              name: gameName.trim(),
              url: gameUrl,
              alreadyOwned: false,
            });
            logger.debug('Found free game: %s (URL: %s)', gameName, gameUrl);
          } else if (alreadyOwned) {
            logger.debug('Game already owned: %s', gameName);
          }
        } catch (err) {
          logger.debug('Error processing game element %d: %s', i, err);
        }
      }

      logger.info('Detected %d free games to claim', games.length);

      const cleanedGames = this.deduplicateGames(games);
      logger.info('After deduplication: %d games', cleanedGames.length);

      return cleanedGames;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Error detecting free games: %s', errorMessage);
      await this.browserManager.takeScreenshot(page, 'detection-error', 'error');
      throw err;
    } finally {
      await page.close();
    }
  }

  private deduplicateGames(games: FreeGame[]): FreeGame[] {
    const seen = new Set<string>();
    return games.filter((game) => {
      if (seen.has(game.name.toLowerCase())) {
        return false;
      }
      seen.add(game.name.toLowerCase());
      return true;
    });
  }
}
