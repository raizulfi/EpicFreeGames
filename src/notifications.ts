import axios from 'axios';
import { Config } from './config';
import { getLogger } from './logger';

export interface NotificationPayload {
  title: string;
  description: string;
  type: 'success' | 'error' | 'info';
  games?: string[];
}

const COLORS = { success: 0x2ecc71, error: 0xe74c3c, info: 0x3498db };

export class NotificationManager {
  constructor(private config: Config) {}

  async sendNotifications(payload: NotificationPayload): Promise<void> {
    if (!this.config.discordWebhookUrl) return;
    try {
      await this.sendDiscord(payload);
    } catch (err) {
      getLogger().error('Discord notification failed: %s', err);
    }
  }

  private async sendDiscord(payload: NotificationPayload): Promise<void> {
    const fields: object[] = [];
    if (payload.games?.length) {
      fields.push({ name: 'Games', value: payload.games.join('\n'), inline: false });
    }

    await axios.post(this.config.discordWebhookUrl!, {
      embeds: [
        {
          title: payload.title,
          description: payload.description,
          color: COLORS[payload.type],
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    });
    getLogger().debug('Discord notification sent');
  }
}
