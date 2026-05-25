# Epic Games Free Games Auto Claimer

Automatically claim free Epic Games promotions using Node.js and Playwright.

## Features

- 🎮 Automatically detect current free Epic Games promotions
- 🔐 Secure login with session persistence
- ⚡ Claim free games automatically
- ⏭️ Skip games already in your library
- 🔄 Handle multiple games in one run
- 🔁 Exponential backoff retry mechanism
- 📸 Screenshot on errors for debugging
- 📝 Comprehensive logging
- 🤖 Anti-bot measures (realistic browser fingerprints, stable selectors)
- 🔔 Discord, Telegram, and email notifications
- 🐳 Docker & Docker Compose support
- ⚙️ GitHub Actions automation
- 📅 Cron scheduling support
- ⚠️ CAPTCHA detection and safe pause

## Requirements

- Node.js 18+
- npm or yarn
- Docker (optional)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/epic-free-games-claimer.git
cd epic-free-games-claimer
npm install
npx playwright install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
EPIC_EMAIL=your_email@example.com
EPIC_PASSWORD=your_password
HEADLESS=true
SCREENSHOT_ON_ERROR=true
```

### 3. Run

```bash
npm run build
npm run claim
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build TypeScript to JavaScript |
| `npm run claim` | Run the game claimer |
| `npm run login` | Test login without claiming |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run debug` | Run with Node debugger |

## Configuration

### Environment Variables

#### Required

- `EPIC_EMAIL` - Your Epic Games email
- `EPIC_PASSWORD` - Your Epic Games password

#### Browser Settings

- `HEADLESS` - Run browser in headless mode (default: `true`)
- `SCREENSHOT_ON_ERROR` - Take screenshots on errors (default: `true`)
- `SCREENSHOT_ON_SUCCESS` - Take screenshots on success (default: `false`)
- `BROWSER_TIMEOUT` - Browser timeout in ms (default: `30000`)

#### Retry Configuration

- `MAX_RETRIES` - Maximum retry attempts (default: `3`)
- `RETRY_DELAY_MS` - Base delay between retries in ms (default: `2000`)
- `EXPONENTIAL_BACKOFF` - Use exponential backoff (default: `true`)

#### Logging

- `LOG_LEVEL` - Log level: `debug`, `info`, `warn`, `error` (default: `info`)
- `LOG_DIR` - Directory for logs (default: `./logs`)

#### Notifications (Optional)

**Discord:**
- `DISCORD_WEBHOOK_URL` - Discord webhook URL for notifications

**Telegram:**
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `TELEGRAM_CHAT_ID` - Telegram chat ID

**Email:**
- `SMTP_HOST` - SMTP server host
- `SMTP_PORT` - SMTP server port (default: `587`)
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password
- `SMTP_FROM` - From email address
- `SMTP_TO` - Recipient email address

#### Advanced

- `PROXY_URL` - Proxy URL (e.g., `http://proxy.example.com:8080`)
- `USER_AGENT` - Custom user agent
- `SESSION_DIR` - Directory for session storage (default: `./sessions`)
- `CLOSE_BROWSER_ON_ERROR` - Close browser on error (default: `true`)
- `CAPTCHA_TIMEOUT` - CAPTCHA wait timeout in ms (default: `300000`)

## Usage Examples

### Local Usage

```bash
# Build
npm run build

# Claim games
npm run claim

# Test login
npm run login

# Debug mode
npm run debug
```

### Docker Usage

```bash
# Build image
docker build -t epic-claimer .

# Run container
docker run --env-file .env \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/sessions:/app/sessions \
  -v $(pwd)/screenshots:/app/screenshots \
  epic-claimer

# Using docker-compose
docker-compose up --build
```

### GitHub Actions

1. Fork this repository
2. Add secrets to GitHub repository settings:
   - `EPIC_EMAIL`
   - `EPIC_PASSWORD`
   - `DISCORD_WEBHOOK_URL` (optional)
   - `TELEGRAM_BOT_TOKEN` (optional)
   - `TELEGRAM_CHAT_ID` (optional)

3. Enable GitHub Actions
4. Workflow runs automatically every Thursday at 10 AM UTC
5. Trigger manually via "Run workflow" button

### Cron Scheduling (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line to run every Thursday at 10 AM
0 10 * * 4 cd /path/to/epic-free-games-claimer && npm run claim >> logs/cron.log 2>&1
```

## Notifications

### Discord

1. Create a Discord server or use existing
2. Create a webhook in channel settings
3. Copy webhook URL to `DISCORD_WEBHOOK_URL`

### Telegram

1. Message @BotFather on Telegram to create a bot
2. Copy bot token to `TELEGRAM_BOT_TOKEN`
3. Message your bot and copy chat ID to `TELEGRAM_CHAT_ID`
4. You can find chat ID by messaging @userinfobot

### Email

Configure SMTP settings for email notifications.

## Deployment Guides

### Windows

1. Install Node.js from https://nodejs.org/
2. Clone repository
3. Run `npm install && npx playwright install`
4. Configure `.env`
5. Create Windows Task Scheduler task:
   - Trigger: Weekly on Thursday at 10 AM
   - Action: Run `npm run claim` in project directory

### Linux VPS

1. SSH into your VPS
2. Install Node.js and dependencies:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs xvfb libgconf-2-4
   ```
3. Clone and setup:
   ```bash
   git clone https://github.com/yourusername/epic-free-games-claimer.git
   cd epic-free-games-claimer
   npm install && npx playwright install
   ```
4. Configure `.env`
5. Add to crontab: `crontab -e`
   ```
   0 10 * * 4 cd ~/epic-free-games-claimer && npm run claim >> logs/cron.log 2>&1
   ```

### Raspberry Pi

1. Install Node.js 18+:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs chromium-browser xvfb
   ```
2. Set Chromium path in `.env`:
   ```env
   CHROME_PATH=/usr/bin/chromium-browser
   ```
3. Follow Linux VPS setup steps

### Docker on Any Platform

1. Install Docker Desktop
2. Clone repository
3. Configure `.env`
4. Run:
   ```bash
   docker-compose up --build
   ```
5. For automated runs, add to your system's cron scheduler

## Troubleshooting

### Login Issues

- Ensure credentials are correct
- Check if Epic Games account has 2FA enabled
- If CAPTCHA appears, you'll need to resolve it manually
- Check logs in `./logs/` for details

### Games Not Detected

- Verify you're logged in: `npm run login`
- Check if games are actually free
- Try manually visiting: https://www.epicgames.com/store/en-US/free-games
- Clear session: `rm -rf sessions/`

### Claim Failures

- Check logs for specific errors
- Verify network connectivity
- Try increasing `MAX_RETRIES`
- Increase `RETRY_DELAY_MS` if getting rate limited

### Screenshots Not Working

- Verify `SCREENSHOT_ON_ERROR=true` in `.env`
- Check `./screenshots/` directory permissions
- Ensure disk space is available

### CAPTCHA Issues

- The bot will pause when CAPTCHA is detected
- Manually complete the CAPTCHA on the page
- Or implement manual solving (see configuration)

## Architecture

```
src/
├── config.ts           # Configuration management
├── logger.ts           # Logging setup
├── browser.ts          # Browser automation
├── auth.ts             # Login handling
├── gameDetector.ts     # Game detection
├── gameClaimer.ts      # Game claiming
├── notifications.ts    # Discord/Telegram/Email
├── index.ts            # Main orchestrator
└── cli/
    ├── claim.ts        # Claim command
    └── login.ts        # Login command
```

## Error Codes

- `0` - Success
- `1` - CAPTCHA required
- `2` - Some claims failed
- `1` (exit) - Critical error

## Logs

Logs are stored in `./logs/` directory with daily files:

- `epic-claimer-YYYY-MM-DD.log` - Main log file
- `error.log` - Error-only log file

View logs:

```bash
# Recent logs
tail -f logs/epic-claimer-*.log

# Search for errors
grep ERROR logs/*.log

# Find specific game
grep "gamename" logs/*.log
```

## Anti-Bot Measures Implemented

- Realistic browser fingerprints
- Persistent session cookies
- Stable CSS selectors
- Proper timing and delays
- User-agent rotation capability
- Proxy support
- CAPTCHA detection and safe pause
- No unnecessary page reloads
- Exponential backoff on failures

## Contributing

Feel free to submit issues and enhancement requests!

## Disclaimer

This tool is for educational purposes. Respect Epic Games' Terms of Service. The author is not responsible for any account bans or issues resulting from using this tool.

## License

MIT

## Support

For issues and questions:
1. Check logs in `./logs/` directory
2. Review troubleshooting guide above
3. Open an issue on GitHub

## Changelog

### v1.0.0

- Initial release
- Basic game claiming
- Discord/Telegram notifications
- Docker support
- GitHub Actions workflow
- Comprehensive logging
