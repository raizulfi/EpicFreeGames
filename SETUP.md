# Setup Guide

## Prerequisites

- **Node.js**: Version 18 or higher ([Download](https://nodejs.org/))
- **npm**: Comes with Node.js
- **Git**: ([Download](https://git-scm.com/))
- **Docker** (optional): For containerized deployment

## Installation Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/epic-free-games-claimer.git
cd epic-free-games-claimer
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages:
- `playwright` - Browser automation
- `dotenv` - Environment configuration
- `winston` - Logging
- `axios` - HTTP requests
- `typescript` - Type safety

### Step 3: Install Playwright Browsers

```bash
npx playwright install
```

This downloads and installs Chromium browser needed for automation.

### Step 4: Build TypeScript

```bash
npm run build
```

Compiles TypeScript source files to JavaScript in the `dist/` directory.

### Step 5: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your information:

```env
# Required
EPIC_EMAIL=your_email@example.com
EPIC_PASSWORD=your_password

# Optional but recommended
HEADLESS=true
SCREENSHOT_ON_ERROR=true
LOG_LEVEL=info

# Notifications (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## Verify Installation

Test the setup:

```bash
# Test login (doesn't claim games)
npm run login

# If successful, you should see login logs
```

Check the logs:

```bash
# View recent logs
tail -f logs/epic-claimer-*.log
```

## First Run

Before automating, do a test run:

```bash
npm run claim
```

Monitor the output and check logs for any issues.

## Running Locally

### One-time Run

```bash
npm run claim
```

### Testing Login

```bash
npm run login
```

### Debug Mode

For troubleshooting:

```bash
npm run debug
```

This runs with Node debugger enabled.

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests (requires browser)
npm run test:e2e
```

## Automation Setup

### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
   - Name: Epic Games Free Games Claimer
   - Trigger: Weekly on Thursday at 10 AM
   - Action:
     - Program: `C:\Program Files\nodejs\node.exe`
     - Arguments: `dist/cli/claim.js`
     - Start in: `C:\path\to\epic-free-games-claimer`

### Linux/Mac Cron

```bash
crontab -e
```

Add this line (runs Thursday at 10 AM):

```
0 10 * * 4 cd /home/user/epic-free-games-claimer && npm run claim >> logs/cron.log 2>&1
```

### Docker

```bash
docker-compose up --build
```

## Configuration Options

### Browser Settings

```env
HEADLESS=true                    # Run headless (no GUI window)
SCREENSHOT_ON_ERROR=true         # Take screenshot when error occurs
SCREENSHOT_ON_SUCCESS=false       # Take screenshot when claim succeeds
BROWSER_TIMEOUT=30000            # Browser timeout in milliseconds
```

### Retry Settings

```env
MAX_RETRIES=3                    # How many times to retry failed claims
RETRY_DELAY_MS=2000              # Base delay between retries
EXPONENTIAL_BACKOFF=true         # Use exponential backoff formula
```

### Logging

```env
LOG_LEVEL=info                   # debug, info, warn, or error
LOG_DIR=./logs                   # Directory to store logs
```

### Notifications

**Discord:**
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

**Telegram:**
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklmnoPQRstuvWXYZ
TELEGRAM_CHAT_ID=987654321
```

### Advanced

```env
PROXY_URL=http://proxy.example.com:8080    # Use HTTP proxy
USER_AGENT=Custom User Agent               # Custom browser user agent
SESSION_DIR=./sessions                     # Where to store login sessions
CLOSE_BROWSER_ON_ERROR=true                # Close browser after error
CAPTCHA_TIMEOUT=300000                     # Wait 5 min for manual CAPTCHA solve
```

## File Structure

```
epic-free-games-claimer/
├── src/                          # Source files
│   ├── config.ts                # Configuration management
│   ├── logger.ts                # Logging setup
│   ├── browser.ts               # Browser automation
│   ├── auth.ts                  # Login handling
│   ├── gameDetector.ts          # Detect free games
│   ├── gameClaimer.ts           # Claim games
│   ├── notifications.ts         # Send notifications
│   ├── index.ts                 # Main claimer class
│   ├── cli/                     # Command line tools
│   │   ├── claim.ts             # Claim command
│   │   └── login.ts             # Login command
│   └── __tests__/               # Unit tests
├── .env.example                 # Example env file
├── .env                         # Your config (git ignored)
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── Dockerfile                   # Docker image
├── docker-compose.yml           # Docker Compose config
├── .github/
│   └── workflows/
│       └── claim.yml            # GitHub Actions workflow
└── logs/                        # Logs directory (git ignored)
```

## Troubleshooting Setup

### npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Try install again
npm install
```

### Playwright install fails

```bash
# Install browser directly
npx playwright install chromium

# Or reinstall all
rm -rf node_modules
npm install
npm run build
```

### TypeScript build fails

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Force rebuild
npm run build
```

### Permission denied on Linux

```bash
# Make scripts executable
chmod +x dist/cli/*.js

# Or use npm run
npm run claim
```

## Next Steps

1. **Set up notifications**: Configure Discord/Telegram for updates
2. **Automate**: Set up Task Scheduler or cron job
3. **Monitor**: Check logs regularly
4. **Test**: Run `npm run test` to verify everything works

## Getting Help

- Check logs in `./logs/` directory
- Read troubleshooting guide
- Review error messages carefully
- Check GitHub issues for similar problems
