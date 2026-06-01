# Epic Free Games Claimer

Automatically claims your weekly free games on Epic Games Store.

## Setup

**Requirements:** Node.js 18+

```bash
npm install
npx playwright install chromium
npm run build
```

Copy `.env.example` to `.env` and fill in your credentials:

```
EPIC_EMAIL=you@example.com
EPIC_PASSWORD=yourpassword
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...   # optional
```

## First run — save your session

Run this once to log in manually (handles CAPTCHA / 2FA):

```bash
npm run manual-login
```

A browser window opens. Log in, then close the window. Your session is saved automatically.

## Claim free games

```bash
npm run claim
```

## Automate with Task Scheduler

Epic Games uses Cloudflare human verification which GitHub Actions cannot bypass. Run locally instead.

### Windows Task Scheduler

**Epic Games rotates free games every Thursday:**
- 8:00 AM PT (Pacific Time, UTC-8)
- 11:00 PM Thursday (Indonesia, UTC+7)
- 4:00 PM UTC (Coordinated Universal Time)

1. Create a file named `claim.bat` in your project folder:

```batch
@echo off
cd C:\path\to\EpicFreeGames
npm run claim
```

2. Open **Task Scheduler** (search in Start menu)
3. Click **Create Basic Task**
4. Name: `Epic Games Claimer`
5. Trigger: Weekly
   - Day: Thursday
   - Time: 8:00 AM (or shortly after, to avoid race conditions)
6. Action: **Start a program**
   - Program: `C:\path\to\EpicFreeGames\claim.bat`
7. Click **Finish**
8. **Right-click the task** → **Properties**
   - General tab: Check "Run with highest privileges"
   - Settings tab: Uncheck "Stop the task if it runs longer than..."
9. Click **OK**

### macOS / Linux with Cron

Open terminal and edit your crontab:

```bash
crontab -e
```

Add this line (Thursday at 10 AM):

```cron
0 10 * * 4 cd /path/to/EpicFreeGames && npm run claim
```

Or for Indonesia time (Thursday at 11 PM):

```cron
0 23 * * 4 cd /path/to/EpicFreeGames && npm run claim
```

Save and exit. Done!
