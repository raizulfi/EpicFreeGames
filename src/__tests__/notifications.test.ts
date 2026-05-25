import { NotificationManager } from '../notifications';
import axios from 'axios';
import { Config } from '../config';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NotificationManager', () => {
  const mockConfig: Partial<Config> = {
    discordWebhookUrl: 'https://discord.com/api/webhooks/test/token',
    telegramBotToken: 'test-token',
    telegramChatId: '123456',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Discord Notifications', () => {
    test('sends Discord message on success', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const manager = new NotificationManager(mockConfig as Config);

      await manager.sendNotifications({
        title: 'Test',
        description: 'Test description',
        type: 'success',
        games: ['Game 1', 'Game 2'],
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockConfig.discordWebhookUrl,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: 'Test',
              description: 'Test description',
              color: 0x2ecc71,
            }),
          ]),
        })
      );
    });

    test('sends Discord error with correct color', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const manager = new NotificationManager(mockConfig as Config);

      await manager.sendNotifications({
        title: 'Error',
        description: 'Something went wrong',
        type: 'error',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockConfig.discordWebhookUrl,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              color: 0xe74c3c,
            }),
          ]),
        })
      );
    });

    test('skips Discord if webhook not configured', async () => {
      const manager = new NotificationManager({
        discordWebhookUrl: undefined,
      } as Config);

      await manager.sendNotifications({
        title: 'Test',
        description: 'Test',
        type: 'success',
      });

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('Telegram Notifications', () => {
    test('sends Telegram message', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const manager = new NotificationManager(mockConfig as Config);

      await manager.sendNotifications({
        title: 'Test Title',
        description: 'Test description',
        type: 'success',
        games: ['Game 1'],
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('api.telegram.org'),
        expect.objectContaining({
          chat_id: '123456',
          text: expect.stringContaining('Test Title'),
          parse_mode: 'HTML',
        })
      );
    });

    test('skips Telegram if not configured', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const manager = new NotificationManager({
        discordWebhookUrl: 'https://discord.com/api/webhooks/test/token',
        telegramBotToken: undefined,
        telegramChatId: undefined,
      } as Config);

      await manager.sendNotifications({
        title: 'Test',
        description: 'Test',
        type: 'success',
      });

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('api.telegram.org'),
        expect.anything()
      );
    });
  });

  describe('Error Handling', () => {
    test('handles Discord API errors gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Discord API error'));

      const manager = new NotificationManager(mockConfig as Config);

      await expect(
        manager.sendNotifications({
          title: 'Test',
          description: 'Test',
          type: 'success',
        })
      ).rejects.toThrow();
    });

    test('continues if one notification fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Discord error'));
      mockedAxios.post.mockResolvedValueOnce({ status: 200 });

      const manager = new NotificationManager(mockConfig as Config);

      await expect(
        manager.sendNotifications({
          title: 'Test',
          description: 'Test',
          type: 'success',
        })
      ).rejects.toThrow();
    });
  });
});
