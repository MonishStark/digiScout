<!-- @format -->

# Digital Scout - Production Deployment Checklist

Use this checklist to track your deployment progress.

---

## ✅ Phase 1: Pre-Deployment Planning (Before Day 1)

### Domain & DNS

- [ ] Domain name purchased
- [ ] Domain registrar access available
- [ ] DNS records documented
- [ ] TTL set to low value (for faster updates)

### API Keys & Credentials

- [ ] Google Generative AI (Gemini) API key obtained
  - [ ] Created at: https://aistudio.google.com/app/apikeys
  - [ ] Key: `GEMINI_API_KEY=_______________`
- [ ] Google Maps API key obtained
  - [ ] Created at: https://console.cloud.google.com
  - [ ] Places API enabled
  - [ ] Maps JavaScript API enabled
  - [ ] Key: `GOOGLE_MAPS_PLATFORM_KEY=_______________`
- [ ] Netlify API token obtained
  - [ ] Created at: https://app.netlify.com/user/applications
  - [ ] Token: `VITE_NETLIFY_TOKEN=_______________`
- [ ] CallHippo API key obtained
  - [ ] Created at: https://app.callhippo.com/
  - [ ] Key: `CALLHIPPO_API_KEY=_______________`

### GCP Setup

- [ ] GCP project created
- [ ] Billing enabled
- [ ] Compute Engine API enabled
- [ ] e2-micro VM created (Ubuntu 22.04 LTS)
- [ ] External static IP reserved
- [ ] VM IP address: `_______________`
- [ ] SSH key pair generated/configured
- [ ] SSH access tested
- [ ] Firewall rules reviewed

### Local Machine Preparation

- [ ] Git repository cloned/downloaded
- [ ] Node.js 20+ installed
- [ ] npm dependencies installed: `npm install`
- [ ] All code working locally
- [ ] Frontend builds successfully: `npm run build`
- [ ] backend starts without errors: `npm run dev:server`
- [ ] dist/ folder created and contains index.html
- [ ] .gitignore updated (to exclude .env.production)

---

## ✅ Phase 2: Environment Configuration (Day 1)

### Generate Secure Passwords

On your local machine or notepad:

```
WORDPRESS_DB_PASSWORD: __________________________ (32 chars)
MARIADB_ROOT_PASSWORD: __________________________ (32 chars)
```

Generation command (run on any machine with openssl):

```bash
openssl rand -base64 32
```

### Create .env.production File

- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Fill in GEMINI_API_KEY
- [ ] Fill in GOOGLE_MAPS_PLATFORM_KEY
- [ ] Fill in VITE_NETLIFY_TOKEN
- [ ] Fill in CALLHIPPO_API_KEY
- [ ] Fill in WORDPRESS_DB_PASSWORD (generated)
- [ ] Fill in MARIADB_ROOT_PASSWORD (generated)
- [ ] Fill in APP_DOMAIN (your domain)
- [ ] Fill in APP_DOMAIN_EMAIL (your email)
- [ ] Review all other variables
- [ ] Save and secure .env.production (don't commit!)
- [ ] Verify `.env.production` is in `.gitignore`

### Verify Frontend Build

```bash
# Build the frontend
npm run build

# Verify dist/ folder exists and has content
ls -la dist/
# Should show: index.html, js/, css/ folders
```

- [ ] Frontend build successful
- [ ] dist/index.html exists
- [ ] dist/ folder size > 100KB

---

## ✅ Phase 3: File Upload to GCP VM (Day 1-2)

### Choose Upload Method

**Option A: gcloud SCP (Recommended)**

```bash
gcloud compute scp --recurse . your-instance-name:/opt/digitalscout/ \
  --zone=us-central1-a \
  --exclude='.git/*' \
  --exclude='node_modules/*' \
  --exclude='.env.local'
```

**Option B: rsync**

```bash
rsync -av --exclude='node_modules' --exclude='.git' \
  --exclude='.env.local' \
  ./ your-vm-ip:/opt/digitalscout/
```

### Upload Steps

- [ ] Choose upload method (gcloud or rsync)
- [ ] Navigate to project root directory
- [ ] Execute upload command
- [ ] Verify upload completes without errors
- [ ] Verify transfer speed and duration acceptable

### Verify Files on VM

SSH into VM and verify:

```bash
ssh your-instance-ip
cd /opt/digitalscout
ls -la
```

- [ ] SSH access works
- [ ] Files visible on VM
- [ ] docker-compose.yml present
- [ ] docker/ folder present with all configs
- [ ] dist/ folder present with frontend build
- [ ] .env.production present (secure copy)

### Verify Directory Structure

```
/opt/digitalscout/
├── docker-compose.yml           [ ]
├── .env.production              [ ]
├── docker/
│   ├── Dockerfile.app           [ ]
│   ├── nginx/
│   │   ├── nginx.conf           [ ]
│   │   └── ssl/ (empty, to be filled)  [ ]
│   ├── wordpress/
│   │   ├── wp-config-extra.php  [ ]
│   │   └── digital-scout-base-theme/  [ ]
│   ├── mariadb/
│   │   └── my.cnf               [ ]
│   └── validate-deployment.sh   [ ]
├── dist/
│   ├── index.html               [ ]
│   ├── assets/                  [ ]
│   └── ...                      [ ]
└── src/                         [ ]
```

---

## ✅ Phase 4: SSL Certificate Configuration (Day 2)

### Prerequisites

- [ ] Domain DNS records NOT yet pointed to VM
- [ ] Port 443 open in GCP firewall
- [ ] cerbot/openssl available

### Option A: Let's Encrypt (Recommended)

```bash
# SSH into VM
ssh your-instance-ip

# Create SSL directory
mkdir -p /opt/digitalscout/docker/nginx/ssl

# Install certbot (if needed)
sudo apt-get update && sudo apt-get install -y certbot

# Generate certificate
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  --agree-tos \
  --email admin@your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem \
  /opt/digitalscout/docker/nginx/ssl/cert.pem

sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem \
  /opt/digitalscout/docker/nginx/ssl/key.pem

# Fix ownership
sudo chown 1000:1000 /opt/digitalscout/docker/nginx/ssl/*
chmod 600 /opt/digitalscout/docker/nginx/ssl/key.pem
```

- [ ] Certbot installed
- [ ] `certonly` command executed successfully
- [ ] Certificates copied to docker/nginx/ssl/
- [ ] cert.pem exists
- [ ] key.pem exists with 600 permissions

### Option B: Self-Signed Certificates (Testing Only)

```bash
# Generate self-signed cert (valid for 365 days)
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /opt/digitalscout/docker/nginx/ssl/key.pem \
  -out /opt/digitalscout/docker/nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"

chmod 600 /opt/digitalscout/docker/nginx/ssl/key.pem
```

- [ ] Self-signed certificates generated (if using this option)
- [ ] Both PEM files exist in docker/nginx/ssl/

### Verify Certificates

```bash
openssl x509 -in docker/nginx/ssl/cert.pem -text -noout
```

- [ ] Certificate details display correctly
- [ ] Domain matches your URL
- [ ] Expiration date is in future

---

## ✅ Phase 5: Docker Deployment (Day 2-3)

### SSH into VM

```bash
gcloud compute ssh your-instance-name --zone=us-central1-a
cd /opt/digitalscout
```

- [ ] SSH session established
- [ ] Working directory: /opt/digitalscout
- [ ] Can see files: `ls -la`

### Verify Docker Installation

```bash
docker --version
docker-compose --version
sudo systemctl status docker
```

- [ ] Docker installed (version 20+)
- [ ] Docker Compose installed (version 1.29+)
- [ ] Docker daemon running

### Build Docker Images

```bash
# Build the Node/Express app image
docker-compose build app
```

- [ ] Build command executed
- [ ] No build errors
- [ ] Image created successfully
- [ ] Message shows "Successfully built ..."

### Start Docker Compose

```bash
# Verify environment file
cat .env.production | head  # Verify format (don't show full file)

# Start all services
docker-compose --env-file .env.production up -d

# Check status
docker-compose ps
```

- [ ] .env.production file verified
- [ ] docker-compose up -d executed
- [ ] All 4 services show "Up" status
- [ ] No error messages

### Monitor Startup

```bash
# Watch logs for ~2 minutes while services start
docker-compose logs -f

# Ctrl+C to exit log view

# Check final status
docker-compose ps
sleep 30  # Wait for health checks
docker-compose ps
```

- [ ] No error messages in logs
- [ ] Services reach healthy status
- [ ] MariaDB initialized
- [ ] Express backend started
- [ ] WordPress PHP-FPM running
- [ ] Nginx ready

### Check Individual Service Logs

```bash
docker-compose logs app       # Check backend
docker-compose logs wordpress # Check WordPress
docker-compose logs mariadb   # Check database
```

- [ ] App logs show no errors
- [ ] WordPress logs show no errors
- [ ] Database initialization complete

---

## ✅ Phase 6: DNS Configuration (Day 3)

### Point Domain to GCP VM

At your domain registrar (GoDaddy, Namecheap, etc.):

1. Log in to account
2. Find DNS settings
3. Update A records:

**Primary domain (A record):**

```
Name: your-domain.com (or @)
Type: A
Value: <your-gcp-vm-external-ip>
TTL: 300 (or minimum)
```

**WWW subdomain (optional but recommended):**

```
Name: www
Type: A
Value: <your-gcp-vm-external-ip>
TTL: 300
```

- [ ] Logged into domain registrar
- [ ] Found DNS settings
- [ ] Created A record for your-domain.com → VM IP
- [ ] Created A record for www.your-domain.com → VM IP (optional)
- [ ] Saved DNS changes
- [ ] Documented original nameservers (for rollback)

### Verify DNS Propagation

```bash
# From your local machine (give 5-10 minutes)
nslookup your-domain.com          # Should resolve to your VM IP
ping your-domain.com               # Should ping your VM
curl https://your-domain.com/health
```

- [ ] DNS query returns correct VM IP
- [ ] Waited 5-30 minutes for propagation
- [ ] `ping your-domain.com` shows VM IP
- [ ] Health check endpoint responding

---

## ✅ Phase 7: WordPress Initialization (Day 3)

### Access WordPress Admin

1. Open browser: `https://your-domain.com/wp-admin/`
   (Accept SSL certificate warning if self-signed)

2. Log in with credentials:
   ```
   Username: (from .env.production WORDPRESS_MULTISITE_NETWORK_USERNAME)
   Password: (initial WordPress password)
   ```

- [ ] WordPress admin accessible
- [ ] Login successful
- [ ] Dashboard visible

### Verify Multisite Configuration

1. Go to: Settings > Network Settings
2. Verify:
   - Network Title = "Digital Scout"
   - Network Admin Email = admin@your-domain.com
   - Subdirectory Installation (NOT Subdomains)

- [ ] Network Settings accessible
- [ ] Multisite mode confirmed
- [ ] Settings correct

### Activate Provisioning Plugin

1. Go to: My Sites > Network Admin > Plugins
2. Find: "Digital Scout Multisite MVP Provisioner"
3. Click: "Network Activate"

- [ ] Network Admin menu accessible
- [ ] Provisioning plugin visible
- [ ] Plugin activated successfully

### Create Application Password

1. Go to: Users > Your Profile
2. Scroll to: "Application Passwords"
3. Type password name: "Digital Scout API"
4. Click: "Add New Application Password"
5. Copy the generated password
6. Update `.env.production`:
   ```
   WORDPRESS_MULTISITE_NETWORK_APP_PASSWORD=<copied_password>
   ```

- [ ] User profile page accessible
- [ ] Application Passwords section visible
- [ ] New application password generated
- [ ] Password copied to .env.production
- [ ] Saved .env.production

### Restart App Container

```bash
docker-compose restart app
```

- [ ] Restart command executed
- [ ] App container restarted successfully
- [ ] No error messages

---

## ✅ Phase 8: Verification & Testing (Day 3-4)

### Run Validation Script

```bash
cd /opt/digitalscout
bash docker/validate-deployment.sh
```

- [ ] Validation script executed
- [ ] All critical checks passed
- [ ] Warning items reviewed (if any)
- [ ] Script shows overall success

### Manual Health Checks

```bash
# Backend health
curl https://your-domain.com/health
# Should return: {"status":"ok"}

# Frontend loads
curl -s https://your-domain.com/ | grep -q "index.html" && echo "Frontend OK"

# WordPress admin accessible
curl -s https://your-domain.com/wp-admin/ | grep -q "login" && echo "WordPress OK"
```

- [ ] Backend health check passes
- [ ] Frontend loads successfully
- [ ] WordPress admin accessible

### Test Full Workflow

1. **Search for Businesses**
   - Navigate to `https://your-domain.com/`
   - Use map to search for businesses
   - Verify results display

2. **Generate Website**
   - Select a business
   - Click "Generate"
   - Verify website schema generated
   - Wait for preview to load

3. **Provision to WordPress**
   - Click "Sync to WordPress"
   - Check for success message
   - Monitor logs: `docker-compose logs app`

4. **Verify Provisioned Site**
   - Go to WordPress Sites
   - New subsite should appear
   - Visit subsite URL: `https://your-domain.com/site-name/`
   - Verify content displays

- [ ] Business search works
- [ ] Generation completes successfully
- [ ] WordPress provisioning succeeds
- [ ] Provisioned site accessible
- [ ] Site content displays correctly

### Check API Endpoints

```bash
# Test various API endpoints
curl -X POST https://your-domain.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

curl -X POST https://your-domain.com/api/qualify-leads \
  -H "Content-Type: application/json" \
  -d '{"businesses":[]}'
```

- [ ] /api/generate responds
- [ ] /api/qualify-leads responds
- [ ] Other API endpoints tested

---

## ✅ Phase 9: Monitoring & Backups (Day 4)

### Set Up Automated Database Backups

```bash
# Create backup script
cd /opt/digitalscout
bash backup-db.sh  # Test manual backup first

# Verify backup created
ls -la backups/
```

- [ ] Backup script exists
- [ ] Manual backup executed successfully
- [ ] Backup file created with timestamp
- [ ] Backup file is readable

### Schedule Automated Backups

```bash
# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/digitalscout/backup-db.sh") | crontab -

# Verify crontab entry
crontab -l | grep backup-db
```

- [ ] Crontab entry created
- [ ] Schedule set for daily 2 AM backup
- [ ] Crontab entry verified

### Monitor Service Status

```bash
# Check status
docker-compose ps

# View resource usage
docker stats

# Check system resources
free -h
df -h
```

- [ ] All services running
- [ ] No service at 100% CPU/Memory
- [ ] Disk space sufficient (> 1 GB free)

---

## ✅ Phase 10: Security Hardening (Day 4-5)

### Configure Firewall

```bash
# Enable UFW (Ubuntu firewall)
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP & HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verify rules
sudo ufw status
```

- [ ] UFW enabled
- [ ] Port 22/SSH allowed
- [ ] Port 80/HTTP allowed
- [ ] Port 443/HTTPS allowed
- [ ] No other ports exposed
- [ ] Firewall rules verified

### Secure Environment Variables

```bash
# Verify .env.production is secure
ls -l .env.production
# Should show: -rw------- (600 permissions)

# If not, fix permissions
chmod 600 .env.production

# Verify it's in .gitignore
cat .gitignore | grep .env.production
```

- [ ] .env.production has 600 permissions
- [ ] .env.production in .gitignore
- [ ] No secrets committed to git

### Set SSL Renewal (Let's Encrypt Only)

```bash
# Test renewal
sudo certbot renew --dry-run

# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify
sudo systemctl status certbot.timer
```

- [ ] Dry-run renewal successful
- [ ] Certbot timer enabled
- [ ] Timer verified to be running

### Document Backup Procedure

- [ ] Backup location documented: `/opt/digitalscout/backups/`
- [ ] Restore procedure documented
- [ ] Backup verification tested
- [ ] Offsite backup considered (GCP Cloud Storage, etc.)

---

## ✅ Phase 11: Documentation & Handoff (Day 5)

### Update Documentation

- [ ] PRODUCTION_DEPLOYMENT_README.md reviewed
- [ ] Specific values updated (domain, IPs, emails)
- [ ] Any customizations documented
- [ ] Known issues listed

### Create Operations Runbook

Document for your team:

- [ ] How to access WordPress admin
- [ ] How to view logs
- [ ] How to restart services
- [ ] How to perform backups
- [ ] Who to contact for issues
- [ ] Escalation procedures

### Test Disaster Scenarios

- [ ] Verified manual backup can be restored
- [ ] Tested service restart procedures
- [ ] Tested log access
- [ ] Emergency contact list created

### Team Training

- [ ] Team briefed on production system
- [ ] Admin access granted to authorized users
- [ ] Operations procedures explained
- [ ] Support process documented

---

## ✅ Phase 12: Post-Deployment (Ongoing)

### Week 1

- [ ] Monitor system performance daily
- [ ] Check logs for errors
- [ ] Verify backups running
- [ ] Monitor disk space
- [ ] Verify DNS stability

### Month 1

- [ ] Test disaster recovery procedure
- [ ] Review and optimize performance
- [ ] Gather user feedback
- [ ] Document issues found
- [ ] Plan for scaling if needed

### Quarterly

- [ ] Review security settings
- [ ] Update documentation
- [ ] Test backup restoration
- [ ] Review costs
- [ ] Plan maintenance window

---

## 📋 Important Contact & Reference Information

**GCP Project ID**: ******\_\_\_******

**VM Instance Name**: ******\_\_\_******

**VM External IP**: ******\_\_\_******

**Domain**: ******\_\_\_******

**WordPress Admin Username**: ******\_\_\_******

**WordPress Admin Email**: ******\_\_\_******

**Database Name**: `digitalscout_wp`

**Database User**: `wp_user`

**Database Root User**: `root`

**Backup Location**: `/opt/digitalscout/backups/`

**Logs Location**: `docker-compose logs`

**Config Files**: `/opt/digitalscout/docker/`

**Documentation**: `/opt/digitalscout/PRODUCTION_DEPLOYMENT_README.md`

---

## ⚠️ Critical Reminders

- 🔐 **Never commit .env.production to git**
- 🔐 **Keep API keys secure and confidential**
- 🔒 **Enable SSL/HTTPS before going live**
- 📅 **Set up automated backups immediately**
- 🚨 **Test disaster recovery procedures**
- 👥 **Limit admin access to authorized personnel only**
- 📊 **Monitor resource usage regularly**
- 🔄 **Plan for regular maintenance windows**

---

## ✅ Final Sign-Off

**Deployment Completed By**: **********\_\_\_**********

**Date**: **********\_\_\_**********

**System Status**: ✅ Ready for Production

**Next Review Date**: **********\_\_\_**********

---

**For help**: Reference DEPLOYMENT_GUIDE.md, DEPLOYMENT_QUICK_REFERENCE.md, or PRODUCTION_ARCHITECTURE.md
