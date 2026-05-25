# Troubleshooting Guide

## Common Issues and Solutions

### Authentication Issues

#### Issue: "Invalid email or password"

**Causes:**
- Wrong credentials
- Account locked
- 2FA enabled

**Solutions:**
1. Verify credentials are correct
2. Log into Epic Games manually to confirm access
3. Disable 2FA temporarily
4. Check for account lockout notifications

#### Issue: "CAPTCHA required"

**Causes:**
- Too many login attempts
- Suspicious activity detected
- First time logging in from this IP

**Solutions:**
1. Wait 30 minutes before retrying
2. Log in manually and complete CAPTCHA
3. Use a residential IP (not datacenter)
4. Set `CAPTCHA_TIMEOUT=600000` for 10 minute wait

#### Issue: "Login confirmation failed"

**Causes:**
- Page didn't load properly
- Browser closed unexpectedly
- Session expired

**Solutions:**
1. Clear sessions: `rm -rf sessions/`
2. Increase `BROWSER_TIMEOUT=60000`
3. Run `npm run login` to test
4. Check internet connection

### Game Detection Issues

#### Issue: No games detected

**Causes:**
- Already own all games
- Page didn't load
- Selector changed on Epic Games website

**Solutions:**
1. Visit https://www.epicgames.com/store/en-US/free-games manually
2. Verify there are actually free games available
3. Check screenshot: `ls screenshots/`
4. Clear sessions: `rm -rf sessions/`
5. Run with debug logging: `LOG_LEVEL=debug npm run claim`

#### Issue: "Get button not found"

**Causes:**
- Selector changed
- Game already claimed
- Page didn't fully load

**Solutions:**
1. Check screenshots for what's displayed
2. Verify not already owned
3. Increase `BROWSER_TIMEOUT=60000`
4. Wait for page network idle: Check logs for load status

### Claiming Issues

#### Issue: "Claim failed, retrying..."

**Causes:**
- Network error
- Page timeout
- Temporary Epic Games issue

**Solutions:**
1. These usually resolve with retries (already happening)
2. Check internet connection
3. Try again later
4. Increase `MAX_RETRIES=5` and `RETRY_DELAY_MS=5000`

#### Issue: Already owned but marked as unclaimed

**Causes:**
- Selector for "already owned" didn't work
- Game was claimed since last run

**Solutions:**
1. It will be skipped automatically
2. This is safe - won't try to claim twice
3. Next run will properly detect it

#### Issue: "Get button still visible after click"

**Causes:**
- Click didn't register
- Button not fully loaded
- JavaScript error

**Solutions:**
1. Increase `BROWSER_TIMEOUT=60000`
2. Set `SCREENSHOT_ON_SUCCESS=true` to see what happened
3. Check console logs in screenshots
4. Retry - usually works on second attempt

### Notification Issues

#### Issue: Discord webhook not sending

**Causes:**
- Invalid webhook URL
- Network blocked
- Discord API issue

**Solutions:**
```bash
# Test webhook manually
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test message"}'
```

1. Verify webhook URL starts with `https://discord.com/api/webhooks/`
2. Check Discord server still exists
3. Verify firewall allows outbound HTTPS
4. Test network: `curl https://discord.com`

#### Issue: Telegram not sending

**Causes:**
- Invalid bot token
- Wrong chat ID
- Network blocked

**Solutions:**
1. Test token: Message @userinfobot to get chat ID
2. Verify bot is active: Send `/start` to bot
3. Double-check `TELEGRAM_CHAT_ID` is numeric only
4. Check firewall allows `api.telegram.org`

#### Issue: Email notifications not sending

**Causes:**
- SMTP server unreachable
- Wrong credentials
- Email blocked

**Solutions:**
1. Verify SMTP settings (Gmail, Outlook, etc.)
2. Gmail requires app-specific password if 2FA enabled
3. Check firewall allows SMTP port (usually 587)
4. Verify email address is correct

### Performance Issues

#### Issue: "Browser timeout"

**Causes:**
- Slow internet
- Busy system
- Page not loading

**Solutions:**
1. Increase `BROWSER_TIMEOUT=60000` or higher
2. Close other applications
3. Check internet speed: `ping 8.8.8.8`
4. Check CPU/RAM usage

#### Issue: High CPU usage

**Causes:**
- Browser keeping pages open
- Logging too verbose
- Too many retries

**Solutions:**
1. Ensure `HEADLESS=true`
2. Set `LOG_LEVEL=info` (not debug)
3. Reduce `MAX_RETRIES` if not needed
4. System should be idle after run

#### Issue: High memory usage

**Causes:**
- Browser contexts not closing
- Session files corrupted
- Leaked page handles

**Solutions:**
1. Clear old logs: `rm -rf logs/`
2. Rebuild: `npm run clean && npm run build`
3. Restart system
4. Check for zombie processes: `ps aux | grep node`

### Docker Issues

#### Issue: Container exits immediately

**Causes:**
- Credentials not set
- Port already in use
- Build failed

**Solutions:**
```bash
# Check logs
docker-compose logs epic-claimer

# Verify .env exists and has EPIC_EMAIL/EPIC_PASSWORD
cat .env | grep EPIC_

# Rebuild
docker-compose down
docker-compose build --no-cache
```

#### Issue: "Permission denied" in Docker

**Causes:**
- Volume permission issue
- Docker daemon not running

**Solutions:**
```bash
# On Linux, add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Or use sudo
sudo docker-compose up
```

#### Issue: Sessions not persisting

**Causes:**
- Volume not mounted properly
- Volume path wrong

**Solutions:**
```bash
# Verify volumes mounted
docker inspect epic-games-claimer | grep -A 5 Mounts

# Check docker-compose volume paths are correct
docker-compose config | grep -A 5 volumes
```

### GitHub Actions Issues

#### Issue: Workflow fails silently

**Causes:**
- Secrets not set
- Node version wrong
- Playwright install failed

**Solutions:**
1. Check repo secrets are configured:
   - `EPIC_EMAIL`
   - `EPIC_PASSWORD`
   - Discord/Telegram tokens (if used)

2. Manually trigger workflow to see detailed logs
3. Check "Actions" tab for job logs
4. Verify Node.js 18+ in workflow file

#### Issue: "No credentials provided"

**Causes:**
- Secrets not added to repo
- Secret names misspelled

**Solutions:**
1. Go to repo Settings → Secrets and variables → Actions
2. Add `EPIC_EMAIL` and `EPIC_PASSWORD`
3. Verify no typos in names
4. Manually re-run workflow

### Cron/Scheduler Issues

#### Linux Cron not running

**Causes:**
- Cron daemon not running
- PATH not set in cron
- Permission issues

**Solutions:**
```bash
# Check cron daemon
ps aux | grep cron

# Use full paths in cron
0 10 * * 4 /usr/bin/node /home/user/epic-games-claimer/dist/cli/claim.js

# Add to crontab with full paths
crontab -e
```

#### Task Scheduler not running on Windows

**Causes:**
- Path incorrect
- User permissions
- PowerShell execution policy

**Solutions:**
1. Use absolute paths to npm/node
2. Run as administrator
3. Test manually first
4. Check Task Scheduler logs

### SSL/Certificate Issues

#### Issue: "Unable to verify the first certificate"

**Causes:**
- Corporate proxy
- Antivirus intercepting HTTPS
- Self-signed certificates

**Solutions:**
```bash
# Disable SSL verification (not recommended for production)
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run claim

# Or use proxy with proper certificate
PROXY_URL=http://proxy.example.com:8080 npm run claim
```

## Debug Mode

Enable comprehensive logging:

```bash
LOG_LEVEL=debug npm run claim
```

This produces detailed logs showing:
- All page navigation
- Button clicks
- Wait events
- Retry attempts
- Full error stack traces

Check output in `logs/epic-claimer-*.log`

## Collecting Debug Information

When reporting issues, gather:

```bash
# System info
node --version
npm --version
npx playwright --version

# Recent logs
tail -50 logs/epic-claimer-*.log
cat logs/error.log

# Screenshots
ls -la screenshots/

# Environment (without credentials)
grep -v PASSWORD .env

# Test command
npm run login
```

## Performance Monitoring

Monitor during runs:

```bash
# Watch logs
watch -n 1 'tail logs/epic-claimer-*.log'

# Monitor system resources
top
# or on Mac:
activity monitor
# or on Windows:
tasklist
```

## Getting Help

When all else fails:

1. **Check logs**: `tail logs/epic-claimer-*.log`
2. **Enable debug**: `LOG_LEVEL=debug npm run claim`
3. **Collect info**: System version, Node version, full error
4. **Search issues**: GitHub issues might have solution
5. **Report issue**: Include logs, error message, and steps to reproduce

## Known Limitations

- **2FA**: Currently not supported, must be disabled
- **Region blocking**: May not work in all countries
- **Rate limiting**: Epic Games may rate limit after multiple attempts
- **Page changes**: Selectors may break if Epic Games changes their site
- **CAPTCHA**: Must be solved manually when appears

## Performance Optimization

For faster runs:

```env
MAX_RETRIES=2                    # Fewer retries
RETRY_DELAY_MS=1000              # Shorter delays
SCREENSHOT_ON_SUCCESS=false       # Don't screenshot success
SCREENSHOT_ON_ERROR=false         # Only take error screenshots when needed
```

For reliability (slower but more reliable):

```env
MAX_RETRIES=5                    # More retries
RETRY_DELAY_MS=3000              # Longer delays
BROWSER_TIMEOUT=60000            # More time to load
EXPONENTIAL_BACKOFF=true         # Increase delays on retries
```
