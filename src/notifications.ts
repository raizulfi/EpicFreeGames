import axios from 'axios';
import { Config } from './config';
import { getLogger } from './logger';

export interface NotificationPayload {
  title: string;
  description: string;
  type: 'success' | 'error' | 'info';
  games?: string[];
}

export class NotificationManager {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async sendNotifications(payload: NotificationPayload): Promise<void> {
    const logger = getLogger();

    const promises = [];

    if (this.config.discordWebhookUrl) {
      promises.push(this.sendDiscord(payload).catch((err) => logger.error('Discord notification failed: %s', err)));
    }

    if (this.config.telegramBotToken && this.config.telegramChatId) {
      promises.push(this.sendTelegram(payload).catch((err) => logger.error('Telegram notification failed: %s', err)));
    }

    await Promise.all(promises);
  }

  private async sendDiscord(payload: NotificationPayload): Promise<void> {
    const logger = getLogger();
    if (!this.config.discordWebhookUrl) {
      return;
    }

    const color = {
      success: 0x2ecc71,
      error: 0xe74c3c,
      info: 0x3498db,
    }[payload.type];

    const fields: any[] = [
      {
        name: 'Type',
        value: payload.type,
        inline: true,
      },
      {
        name: 'Timestamp',
        value: new Date().toISOString(),
        inline: true,
      },
    ];

    if (payload.games && payload.games.length > 0) {
      fields.push({
        name: 'Games',
        value: payload.games.join(', '),
        inline: false,
      });
    }

    const embed = {
      title: payload.title,
      description: payload.description,
      color,
      fields,
      timestamp: new Date().toISOString(),
    };

    try {
      await axios.post(this.config.discordWebhookUrl, { embeds: [embed] });
      logger.debug('Discord notification sent');
    } catch (err) {
      logger.error('Failed to send Discord notification: %s', err);
      throw err;
    }
  }

  private async sendTelegram(payload: NotificationPayload): Promise<void> {
    const logger = getLogger();
    if (!this.config.telegramBotToken || !this.config.telegramChatId) {
      return;
    }

    const message = `
<b>${payload.title}</b>

${payload.description}

<i>Type: ${payload.type}</i>
${payload.games ? `<i>Games: ${payload.games.join(', ')}</i>` : ''}
    `.trim();

    const url = `https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`;

    try {
      await axios.post(url, {
        chat_id: this.config.telegramChatId,
        text: message,
        parse_mode: 'HTML',
      });
      logger.debug('Telegram notification sent');
    } catch (err) {
      logger.error('Failed to send Telegram notification: %s', err);
      throw err;
    }
  }
}
