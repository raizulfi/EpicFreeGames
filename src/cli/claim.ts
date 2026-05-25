import EpicGamesClaimer from '../index';
import { getLogger } from '../logger';

async function main() {
  const claimer = new EpicGamesClaimer();

  try {
    const summary = await claimer.claim();

    const exitCode =
      summary.requiresCaptcha > 0
        ? 1
        : summary.failed > 0
          ? 2
          : 0;

    process.exit(exitCode);
  } catch (err) {
    getLogger().error('Fatal error: %s', err);
    process.exit(1);
  }
}

main();
