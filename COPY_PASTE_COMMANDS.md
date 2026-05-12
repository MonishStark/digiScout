<!-- @format -->

# Digital Scout - COPY-PASTE DEPLOYMENT COMMANDS

**Instructions**: Copy each command block and paste into terminal. Execute in order. Replace placeholders marked with `YOUR_*` with your actual values.

---

## PRE-DEPLOYMENT (On Your Local Machine)

### LOCAL-1: Generate Passwords

```bash
# Generate password 1 (copy output)
openssl rand -base64 32
# Save as: WORDPRESS_DB_PASSWORD

# Generate password 2 (copy output)
openssl rand -base64 32
# Save as: MARIADB_ROOT_PASSWORD
```

### LOCAL-2: Prepare Environment

```bash
cp .env.production.example .env.production

# Open in editor and fill in:
# GEMINI_API_KEY=YOUR_ACTUAL_KEY
# GOOGLE_MAPS_PLATFORM_KEY=YOUR_ACTUAL_KEY
# VITE_NETLIFY_TOKEN=YOUR_ACTUAL_TOKEN
# CALLHIPPO_API_KEY=YOUR_ACTUAL_KEY
# WORDPRESS_DB_PASSWORD=YOUR_PASSWORD_1
# MARIADB_ROOT_PASSWORD=YOUR_PASSWORD_2
# APP_DOMAIN=your-domain.com
# APP_DOMAIN_EMAIL=admin@your-domain.com

nano .env.production
```

### LOCAL-3: Build Frontend

```bash
npm run build
ls -la dist/index.html
```

### LOCAL-4: Verify Local Files Exist

```bash
ls -la docker-compose.yml docker/Dockerfile.app docker/nginx/nginx.conf docker/wordpress/wp-config-extra.php docker/mariadb/my.cnf .env.production dist/index.html
```

### LOCAL-5: Set VM Variables

```bash
export VM_NAME="digitalscout-prod"
export VM_ZONE="us-central1-a"
export VM_IP="YOUR_GCP_VM_EXTERNAL_IP"

# Verify variables set:
echo $VM_NAME $VM_ZONE $VM_IP
```

### LOCAL-6: Upload to GCP VM

```bash
gcloud compute scp --recurse \
  --exclude='.git/*' \
  --exclude='node_modules/*' \
  --exclude='.env.local' \
  ./ ${VM_NAME}:/opt/digitalscout/ \
  --zone=${VM_ZONE}
```

### LOCAL-7: Verify Upload

```bash
gcloud compute ssh ${VM_NAME} --zone=${VM_ZONE} -- \
  "ls -la /opt/digitalscout/docker-compose.yml && echo 'Upload successful'"
```

---

## ON GCP VM - Phase 1: Basic Setup

### VM-1: SSH Into VM

```bash
gcloud compute ssh ${VM_NAME} --zone=${VM_ZONE}

# Once connected, you should see: ubuntu@vm-name:~$
```

### VM-2: Navigate to App

```bash
cd /opt/digitalscout
pwd
ls -la
```

### VM-3: Verify Docker Installation

```bash
docker --version
docker-compose --version
sudo systemctl status docker
```

### VM-4: Create SSL Directory

```bash
mkdir -p docker/nginx/ssl
ls -la docker/nginx/
```

---

## ON GCP VM - Phase 2: SSL Certificate Setup

### VM-5A: Let's Encrypt (Recommended)

```bash
# Replace YOUR_DOMAIN_COM with your actual domain (no https://)
# Example: your-domain.com

sudo apt-get update -qq
sudo apt-get install -y certbot

sudo certbot certonly --standalone \
  -d YOUR_DOMAIN_COM \
  -d www.YOUR_DOMAIN_COM \
  --agree-tos \
  --email admin@YOUR_DOMAIN_COM \
  --non-interactive

# Copy certificates
sudo cp /etc/letsencrypt/live/YOUR_DOMAIN_COM/fullchain.pem \
  /opt/digitalscout/docker/nginx/ssl/cert.pem

sudo cp /etc/letsencrypt/live/YOUR_DOMAIN_COM/privkey.pem \
  /opt/digitalscout/docker/nginx/ssl/key.pem

# Fix permissions
sudo chown 1000:1000 /opt/digitalscout/docker/nginx/ssl/*
chmod 600 /opt/digitalscout/docker/nginx/ssl/key.pem

# Verify
ls -la /opt/digitalscout/docker/nginx/ssl/
```

### VM-5B: OR Self-Signed (Testing Only)

```bash
cd /opt/digitalscout

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout docker/nginx/ssl/key.pem \
  -out docker/nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Org/CN=YOUR_DOMAIN_COM"

chmod 600 docker/nginx/ssl/key.pem
ls -la docker/nginx/ssl/
```

---

## ON LOCAL MACHINE - Phase 3: DNS (Do This After SSL Setup)

### LOCAL-DNS: Update DNS Records

**Go to your domain registrar website (GoDaddy, Namecheap, etc.)**

**Create/Update A Records:**

```
Record 1:
  Name: YOUR_DOMAIN_COM (or @ symbol)
  Type: A
  Value: YOUR_GCP_VM_EXTERNAL_IP
  TTL: 300
  Click Save

Record 2:
  Name: www
  Type: A
  Value: YOUR_GCP_VM_EXTERNAL_IP
  TTL: 300
  Click Save
```

**Wait 5-10 minutes for propagation.**

### LOCAL-DNS-VERIFY: Test DNS Propagation

```bash
# Run after 5 minutes
nslookup YOUR_DOMAIN_COM
# Should show: YOUR_GCP_VM_EXTERNAL_IP

# If not resolved, wait another 5-10 minutes and try again
```

---

## ON GCP VM - Phase 4: Docker Deployment

### VM-6: Build Docker Image

```bash
cd /opt/digitalscout

docker-compose build app

# Wait for "Successfully built ..." message
```

### VM-7: Start All Services

```bash
cd /opt/digitalscout

docker-compose --env-file .env.production up -d

sleep 10

docker-compose ps
```

**Should show all 4 services:**

```
nginx      Up (healthy)
app        Up (healthy)
wordpress  Up (healthy)
mariadb    Up (healthy)
```

### VM-8: Wait for Database Initialization

```bash
# Monitor database startup
docker-compose logs mariadb

# Wait for message: "ready for connections"

# Then check status again
sleep 30
docker-compose ps
```

---

## ON LOCAL MACHINE - Phase 5: Verify Deployment

### LOCAL-VERIFY-1: Test Health Endpoint

```bash
# Replace YOUR_DOMAIN_COM with your actual domain

curl -k https://YOUR_DOMAIN_COM/health

# Should return: {"status":"ok"}
```

### LOCAL-VERIFY-2: Test Frontend Loads

```bash
curl -k https://YOUR_DOMAIN_COM/ | head -20

# Should show HTML content with <html>, <head>, etc.
```

### LOCAL-VERIFY-3: Test WordPress Admin

```bash
curl -k https://YOUR_DOMAIN_COM/wp-admin/ | grep "wp-login"

# Should return: 1 (file contains wp-login)
```

---

## ON BROWSER - Phase 6: WordPress Admin Setup

### BROWSER-1: Access WordPress Admin

```
Open: https://YOUR_DOMAIN_COM/wp-admin/
Username: (from .env.production WORDPRESS_MULTISITE_NETWORK_USERNAME)
Password: (from .env.production, check what password was set)
Click: Log In
```

### BROWSER-2: Verify Multisite Settings

```
Go to: Settings > Network Settings
Verify:
  ☑ Network Title = "Digital Scout"
  ☑ Network Admin Email = your email
  ☑ Selected = "Sub-directories" (NOT Sub-domains)
Click: Save
```

### BROWSER-3: Activate Provisioning Plugin

```
Go to: My Sites > Network Admin > Plugins
Find: "Digital Scout Multisite MVP Provisioner"
Click: "Network Activate"
```

### BROWSER-4: Create Application Password

```
Go to: Users > Your Profile
Scroll to: Application Passwords
Type name: Digital Scout API
Click: Add New Application Password
Copy the generated password (looks like: xxxx xxxx xxxx xxxx)
Save it somewhere safe
```

---

## ON GCP VM - Phase 7: Update Credentials

### VM-9: Edit .env.production

```bash
cd /opt/digitalscout

nano .env.production

# Find: WORDPRESS_MULTISITE_NETWORK_APP_PASSWORD=
# Replace with password you copied from WordPress
# (It will have spaces in it, that's normal)

# Save: Ctrl+O, Enter, Ctrl+X
```

### VM-10: Restart App Container

```bash
cd /opt/digitalscout

docker-compose restart app

sleep 5

docker-compose ps
```

---

## ON LOCAL MACHINE - Phase 8: API Testing

### LOCAL-API-1: Test Backend API

```bash
curl -k https://YOUR_DOMAIN_COM/health

# Expected: {"status":"ok"}
```

### LOCAL-API-2: Test Generate Endpoint

```bash
curl -k -X POST https://YOUR_DOMAIN_COM/api/generate \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Business"}'

# Expected: JSON response with website schema
```

---

## ON GCP VM - Phase 9: Validation

### VM-11: Run Validation Script

```bash
cd /opt/digitalscout

bash docker/validate-deployment.sh

# Wait for completion
# Should show: ✓ All critical checks passed!
```

---

## ON BROWSER - Phase 10: End-to-End Test

### BROWSER-TEST-1: Search for Business

```
Open: https://YOUR_DOMAIN_COM/
Use the map to search for a business
Select a result
```

### BROWSER-TEST-2: Generate Website

```
Click: "Generate"
Wait for website preview to load
Review the generated content
```

### BROWSER-TEST-3: Provision to WordPress

```
Click: "Sync to WordPress"
Wait for success message
```

### BROWSER-TEST-4: Verify Provisioned Site

```
Open: https://YOUR_DOMAIN_COM/wp-admin/
Go to: My Sites
New site should appear
Click on it to view public site
Content should be visible
```

---

## ON GCP VM - Phase 11: Production Hardening

### VM-12: Set Up Backups

```bash
cd /opt/digitalscout

# Test backup
./backup-db.sh

# Wait for completion
# Check backup created
ls -la backups/
```

### VM-13: Schedule Automated Backups

```bash
# Add to crontab (daily 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/digitalscout/backup-db.sh") | crontab -

# Verify
crontab -l | grep backup
```

### VM-14: Configure Firewall

```bash
# Enable firewall
sudo ufw enable

# Allow SSH (CRITICAL!)
sudo ufw allow 22/tcp

# Allow web traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check rules
sudo ufw status

# Should show 22, 80, 443 as ALLOW
```

### VM-15: Enable SSL Auto-Renewal (Let's Encrypt Only)

```bash
# Test renewal
sudo certbot renew --dry-run

# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify
sudo systemctl status certbot.timer
```

---

## ONGOING OPERATIONS

### VM-OPS-1: View Service Status

```bash
cd /opt/digitalscout
docker-compose ps
```

### VM-OPS-2: View Live Logs

```bash
cd /opt/digitalscout
docker-compose logs -f

# Press Ctrl+C to exit
```

### VM-OPS-3: View Specific Service Logs

```bash
cd /opt/digitalscout
docker-compose logs -f app       # Backend
docker-compose logs -f wordpress # WordPress
docker-compose logs -f mariadb   # Database
docker-compose logs -f nginx     # Web server
```

### VM-OPS-4: Restart Services

```bash
cd /opt/digitalscout

# Restart one service
docker-compose restart app

# Restart all services
docker-compose restart
```

### VM-OPS-5: Check System Resources

```bash
# Memory usage
free -h

# Disk space
df -h

# Docker resource usage
docker stats

# Exit: Ctrl+C
```

---

## EMERGENCY PROCEDURES

### VM-EMERGENCY-1: Stop Everything

```bash
cd /opt/digitalscout
docker-compose down
```

### VM-EMERGENCY-2: Restart Everything

```bash
cd /opt/digitalscout
docker-compose --env-file .env.production up -d
```

### VM-EMERGENCY-3: View Database

```bash
# Get password first
grep MARIADB_ROOT_PASSWORD /opt/digitalscout/.env.production

# Then:
cd /opt/digitalscout
docker-compose exec mariadb mysql -u root -p${MARIADB_ROOT_PASSWORD}

# At mysql> prompt:
USE digitalscout_wp;
SELECT * FROM wp_users LIMIT 1;
EXIT;
```

### VM-EMERGENCY-4: Restore from Backup

```bash
cd /opt/digitalscout

# List backups
ls -la backups/

# Restore (replace YYYYMMDD_HHMMSS with actual backup file)
docker-compose exec -T mariadb mysql \
  -u root -p${MARIADB_ROOT_PASSWORD} \
  < backups/db_backup_YYYYMMDD_HHMMSS.sql

# Restart WordPress
docker-compose restart wordpress app
```

### VM-EMERGENCY-5: Full Redeployment

```bash
cd /opt/digitalscout

# Stop everything
docker-compose down

# Remove containers
docker-compose rm -f

# Rebuild and restart
docker-compose build app
docker-compose --env-file .env.production up -d
```

---

## EXACT EXECUTION ORDER

**Follow this sequence exactly:**

1. ✅ LOCAL-1 through LOCAL-7 (Local machine prep & upload)
2. ✅ VM-1 through VM-4 (VM setup)
3. ✅ VM-5A or VM-5B (SSL - choose one)
4. ✅ LOCAL-DNS (Update DNS, wait 5-10 min)
5. ✅ VM-6 through VM-8 (Docker deployment)
6. ✅ LOCAL-VERIFY-1 through LOCAL-VERIFY-3 (Test deployment)
7. ✅ BROWSER-1 through BROWSER-4 (WordPress setup)
8. ✅ VM-9 through VM-10 (Update credentials)
9. ✅ LOCAL-API-1 through LOCAL-API-2 (Test APIs)
10. ✅ VM-11 (Validation script)
11. ✅ BROWSER-TEST-1 through BROWSER-TEST-4 (End-to-end test)
12. ✅ VM-12 through VM-15 (Production hardening)

**DEPLOYMENT COMPLETE**

---

**Ready?** Start with LOCAL-1 and work your way down.
