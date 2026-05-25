import EpicGamesClaimer from '../index';
import { getLogger } from '../logger';

async function main() {
  const claimer = new EpicGamesClaimer();

  try {
    await claimer.login();
    process.exit(0);
  } catch (err) {
    getLogger().error('Fatal error: %s', err);
    process.exit(1);
  }
}

main();
