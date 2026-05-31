import axios from 'axios';
import { getLogger } from './logger';

export interface FreeGame {
  name: string;
  url: string;
  alreadyOwned: boolean;
}

const FREE_GAMES_API =
  'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions';

export class GameDetector {
  async detectFreeGames(): Promise<FreeGame[]> {
    const logger = getLogger();
    logger.info('Fetching free games from Epic Games API...');

    const { data } = await axios.get(FREE_GAMES_API, {
      params: { locale: 'en-US', country: 'US', allowCountries: 'US' },
      timeout: 15000,
    });

    const elements: any[] = data?.data?.Catalog?.searchStore?.elements ?? [];
    const now = new Date();
    const games: FreeGame[] = [];

    for (const el of elements) {
      const groups: any[] = el.promotions?.promotionalOffers ?? [];
      const isFreeNow = groups.some((group: any) =>
        (group.promotionalOffers ?? []).some((offer: any) => {
          const withinWindow =
            new Date(offer.startDate) <= now && now <= new Date(offer.endDate);
          // discountPercentage: 0 means you pay 0% of price = fully free
          const isFullDiscount = offer.discountSetting?.discountPercentage === 0;
          return withinWindow && isFullDiscount;
        })
      );

      if (!isFreeNow) continue;

      // productSlug sometimes has "/home" suffix
      const slug =
        el.productSlug?.replace(/\/home$/, '') ||
        el.urlSlug ||
        el.catalogNs?.mappings?.[0]?.pageSlug;

      if (!slug) {
        logger.debug('Skipping "%s" — no URL slug found', el.title);
        continue;
      }

      const url = `https://www.epicgames.com/store/en-US/p/${slug}`;
      games.push({ name: el.title, url, alreadyOwned: false });
      logger.info('Free game: %s → %s', el.title, url);
    }

    logger.info('%d free game(s) available this week', games.length);
    return games;
  }
}
