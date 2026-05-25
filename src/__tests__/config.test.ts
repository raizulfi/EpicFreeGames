import { getConfig } from '../config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('loads required environment variables', () => {
    process.env.EPIC_EMAIL = 'test@example.com';
    process.env.EPIC_PASSWORD = 'password123';

    const config = getConfig();

    expect(config.epicEmail).toBe('test@example.com');
    expect(config.epicPassword).toBe('password123');
  });

  test('throws error when required variables are missing', () => {
    delete process.env.EPIC_EMAIL;
    delete process.env.EPIC_PASSWORD;

    expect(() => getConfig()).toThrow();
  });

  test('uses default values for optional settings', () => {
    process.env.EPIC_EMAIL = 'test@example.com';
    process.env.EPIC_PASSWORD = 'password123';
    delete process.env.HEADLESS;
    delete process.env.MAX_RETRIES;

    const config = getConfig();

    expect(config.headless).toBe(true);
    expect(config.maxRetries).toBe(3);
    expect(config.logLevel).toBe('info');
  });

  test('parses boolean environment variables correctly', () => {
    process.env.EPIC_EMAIL = 'test@example.com';
    process.env.EPIC_PASSWORD = 'password123';
    process.env.HEADLESS = 'false';
    process.env.SCREENSHOT_ON_ERROR = 'true';

    const config = getConfig();

    expect(config.headless).toBe(false);
    expect(config.screenshotOnError).toBe(true);
  });

  test('parses numeric environment variables correctly', () => {
    process.env.EPIC_EMAIL = 'test@example.com';
    process.env.EPIC_PASSWORD = 'password123';
    process.env.MAX_RETRIES = '5';
    process.env.BROWSER_TIMEOUT = '60000';

    const config = getConfig();

    expect(config.maxRetries).toBe(5);
    expect(config.browserTimeout).toBe(60000);
  });
});
