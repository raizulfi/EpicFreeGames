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

## Automate with GitHub Actions

1. Fork this repo
2. Go to **Settings → Secrets** and add `EPIC_EMAIL`, `EPIC_PASSWORD`, and optionally `DISCORD_WEBHOOK_URL`
3. The workflow runs every Thursday at 10:00 UTC (when Epic rotates free games)

To trigger it manually: **Actions → Epic Games Free Games Claimer → Run workflow**
