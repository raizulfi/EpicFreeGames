# Deployment Guides

## Windows Desktop

### Prerequisites
- Windows 10/11
- Node.js 18+ ([Download](https://nodejs.org/))
- Optionally: PowerShell or Command Prompt

### Step-by-Step

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/epic-free-games-claimer.git
   cd epic-free-games-claimer
   ```

2. **Install Dependencies**
   ```bash
   npm install
   npx playwright install
   npm run build
   ```

3. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Edit with Notepad: Right-click `.env` → Edit
   - Add your Epic Games credentials

4. **Test Run**
   ```bash
   npm run claim
   ```
   Monitor output and check `logs/` directory

5. **Set Up Scheduled Run**
   
   **Option A: Task Scheduler (GUI)**
   - Press `Win + R`, type `taskschd.msc`
   - Right-click "Task Scheduler Library" → Create Basic Task
   - Name: "Epic Games Claimer"
   - Trigger: Weekly, Thursday, 10:00 AM
   - Action:
     - Program: `C:\Program Files\nodejs\node.exe`
     - Arguments: `dist/cli/claim.js`
     - Start in: `C:\path\to\epic-free-games-claimer`
   - Conditions: Only run if idle
   - Click OK

   **Option B: PowerShell Script**
   ```powershell
   # Create file: run-claimer.ps1
   Set-Location "C:\path\to\epic-free-games-claimer"
   npm run claim
   ```
   
   Then schedule this PowerShell script in Task Scheduler

### Troubleshooting Windows
- Ensure Node.js is in PATH: Open cmd, type `node --version`
- Use full paths in Task Scheduler
- Run Task Scheduler as administrator
- Check Windows Event Viewer for task execution logs

---

## Linux VPS

### Prerequisites
- Ubuntu 20.04+ or similar Linux distro
- SSH access
- Sudo privileges

### Step-by-Step

1. **Connect to VPS**
   ```bash
   ssh user@your-vps-ip
   ```

2. **Install System Dependencies**
   ```bash
   sudo apt-get update
   sudo apt-get upgrade -y
   sudo apt-get install -y curl git wget ca-certificates
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Verify
   node --version
   npm --version
   ```

4. **Install Chromium (for Playwright)**
   ```bash
   # Required dependencies
   sudo apt-get install -y \
     libnss3 \
     libxss1 \
     libasound2 \
     libappindicator1 \
     libindicator7 \
     fonts-liberation \
     xdg-utils \
     libatk-bridge2.0-0 \
     libgconf-2-4
   ```

5. **Clone and Setup**
   ```bash
   cd ~
   git clone https://github.com/yourusername/epic-free-games-claimer.git
   cd epic-free-games-claimer
   npm install
   npx playwright install
   npm run build
   ```

6. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit with nano
   ```
   Add credentials and save (Ctrl+X, Y, Enter)

7. **Test Run**
   ```bash
   npm run claim
   tail -f logs/epic-claimer-*.log
   ```

8. **Set Up Cron Job**
   ```bash
   crontab -e
   ```
   Add this line (runs every Thursday at 10 AM UTC):
   ```
   0 10 * * 4 cd ~/epic-free-games-claimer && npm run claim >> logs/cron.log 2>&1
   ```

9. **Optional: Set Up Log Rotation**
   ```bash
   sudo nano /etc/logrotate.d/epic-claimer
   ```
   Add:
   ```
   ~/epic-free-games-claimer/logs/*.log {
     daily
     rotate 7
     compress
     delaycompress
     missingok
     notifempty
   }
   ```

### Advanced: Systemd Service (Optional)

Create `/etc/systemd/system/epic-claimer.service`:
```ini
[Unit]
Description=Epic Games Free Games Claimer
After=network.target

[Service]
Type=oneshot
User=ubuntu
WorkingDirectory=/home/ubuntu/epic-free-games-claimer
ExecStart=/usr/bin/npm run claim
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin"

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable epic-claimer.service
sudo systemctl start epic-claimer.service
```

---

## Raspberry Pi

### Prerequisites
- Raspberry Pi 4 (2GB+ RAM recommended) or Pi 5
- Raspberry Pi OS (32-bit or 64-bit)
- SSH access or direct connection

### Step-by-Step

1. **Update System**
   ```bash
   sudo apt-get update
   sudo apt-get upgrade -y
   ```

2. **Install Node.js 18**
   ```bash
   # For 32-bit Raspberry Pi OS
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   nvm install 18
   
   # Or direct installation (faster, 64-bit only)
   sudo apt-get install -y nodejs npm
   ```

3. **Install Chromium**
   ```bash
   sudo apt-get install -y chromium-browser
   ```

4. **Increase Swap** (important for Pi)
   ```bash
   sudo dphys-swapfile swapoff
   sudo nano /etc/dphys-swapfile
   # Change CONF_SWAPSIZE=2048 (from 100)
   sudo dphys-swapfile swapon
   ```

5. **Clone and Setup**
   ```bash
   cd ~
   git clone https://github.com/yourusername/epic-free-games-claimer.git
   cd epic-free-games-claimer
   npm install
   npx playwright install chromium
   npm run build
   ```

6. **Configure .env**
   ```bash
   cp .env.example .env
   nano .env
   ```

7. **Test Run** (will be slow on Pi)
   ```bash
   npm run claim
   ```

8. **Add to Cron**
   ```bash
   crontab -e
   ```
   ```
   0 10 * * 4 cd ~/epic-free-games-claimer && npm run claim >> logs/cron.log 2>&1
   ```

### Optimization for Raspberry Pi

In `.env`:
```env
HEADLESS=true
SCREENSHOT_ON_ERROR=false
BROWSER_TIMEOUT=60000
MAX_RETRIES=2
RETRY_DELAY_MS=3000
LOG_LEVEL=warn
```

---

## Docker Deployment

### Local Docker

1. **Install Docker Desktop**
   - Windows/Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Linux: `sudo apt-get install -y docker.io docker-compose`

2. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/epic-free-games-claimer.git
   cd epic-free-games-claimer
   ```

3. **Create `.env`**
   ```bash
   cp .env.example .env
   # Edit with your credentials
   ```

4. **Build and Run**
   ```bash
   docker-compose build
   docker-compose up
   ```

5. **Scheduled Runs**
   - Use system cron/Task Scheduler to run `docker-compose up` on schedule
   - Or use a cron container (advanced)

### Docker on Unraid

1. Install Docker Community Applications
2. Add repository: `https://github.com/yourusername/epic-free-games-claimer`
3. Configure environment variables
4. Set up scheduler to run container weekly

### Docker on NAS (Synology, QNAP)

1. Install Docker from package center
2. Clone repository or download image
3. Create new container with volume mounts:
   - `/app/logs` → `/volume1/docker/epic-logs`
   - `/app/sessions` → `/volume1/docker/epic-sessions`
4. Set environment variables
5. Schedule task to run weekly

---

## GitHub Actions (Cloud)

### Setup

1. **Fork Repository**
   - Go to https://github.com/yourusername/epic-free-games-claimer
   - Click Fork

2. **Add Secrets**
   - Go to repo Settings → Secrets and variables → Actions
   - Add:
     - `EPIC_EMAIL` - Your Epic Games email
     - `EPIC_PASSWORD` - Your Epic Games password
     - `DISCORD_WEBHOOK_URL` (optional)
     - `TELEGRAM_BOT_TOKEN` (optional)
     - `TELEGRAM_CHAT_ID` (optional)

3. **Enable Actions**
   - Go to Actions tab
   - Click "Enable Actions"

4. **Workflow runs automatically**
   - Every Thursday at 10 AM UTC
   - Or manually via "Run workflow" button

5. **Check Results**
   - Go to Actions tab
   - View logs for each run
   - Download artifacts (logs, screenshots)

**Pros:**
- No local machine needed
- Free tier sufficient
- Automatic scheduling
- Logs kept for 30 days

**Cons:**
- Shared IP (potential rate limiting)
- 5-minute timeout on free tier (usually enough)
- GitHub policies may change

---

## AWS EC2 Deployment

### Setup

1. **Launch EC2 Instance**
   - Instance type: `t3.micro` (free tier eligible)
   - OS: Ubuntu 20.04 LTS
   - Storage: 20GB
   - Security group: Allow SSH inbound

2. **Connect to Instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   ```

3. **Follow Linux VPS setup above**

4. **Elastic IP** (optional, keeps same IP)
   - In AWS console, allocate Elastic IP
   - Associate with instance

### Costs
- EC2 micro: ~$10/month
- Or use free tier (first 12 months)
- Plus data transfer charges if large volumes

---

## Google Cloud Run (Serverless)

For completely hands-off approach:

1. Create Dockerfile (already provided)
2. Build image: `docker build -t gcr.io/PROJECT/epic-claimer .`
3. Push to Container Registry
4. Deploy to Cloud Run
5. Set Cloud Scheduler to trigger via HTTP

---

## Self-Hosted Server Monitoring

### Keep Running with PM2

```bash
npm install -g pm2
pm2 start "npm run claim" --name "epic-claimer" --cron "0 10 * * 4"
pm2 save
pm2 startup
```

### Monitor with Uptimerobot

1. Go to [Uptimerobot](https://uptimerobot.com/)
2. Create webhook monitor for your deployment
3. Get alerts if runs fail

---

## Comparison Table

| Method | Setup | Cost | Maintenance | Reliability |
|--------|-------|------|-------------|-------------|
| Windows Task Scheduler | Easy | Free | Low | High |
| Linux Cron | Medium | Free | Low | High |
| Raspberry Pi | Medium | Low | Medium | Medium |
| Docker | Medium | Free/Low | Medium | High |
| GitHub Actions | Easy | Free | Very Low | Medium |
| AWS EC2 | Hard | $10-20/mo | Medium | High |
| Cloud Run | Hard | $5-20/mo | Very Low | High |

---

## Best Practices

1. **Backups**: Keep sessions and logs backed up
2. **Monitoring**: Set up Discord/Telegram notifications
3. **Logs**: Rotate logs regularly to save space
4. **Updates**: Periodically update dependencies: `npm update`
5. **Testing**: Test run before scheduling
6. **Redundancy**: Run on multiple systems if critical
7. **Error Handling**: Check logs after each run
