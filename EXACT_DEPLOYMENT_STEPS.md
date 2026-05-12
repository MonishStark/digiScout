<!-- @format -->

# Digital Scout - EXACT Deployment Execution Guide

**Goal**: Deploy from zero to live on your GCP VM in exact order

---

## PHASE 1: LOCAL PREPARATION (On Your Machine)

### Step 1.1: Prepare Environment File

```bash
# Copy example to production
cp .env.production.example .env.production

# Edit with your REAL values
nano .env.production
```

**MUST FILL IN:**

```
GEMINI_API_KEY=your_actual_key
GOOGLE_MAPS_PLATFORM_KEY=your_actual_key
VITE_NETLIFY_TOKEN=your_actual_token
CALLHIPPO_API_KEY=your_actual_key
WORDPRESS_DB_PASSWORD=use_generated_password
MARIADB_ROOT_PASSWORD=use_generated_password
APP_DOMAIN=your-domain.com
APP_DOMAIN_EMAIL=admin@your-domain.com
```

**Generate passwords:**

```bash
openssl rand -base64 32  # Run twice, use output for both passwords
```

### Step 1.2: Build Frontend

```bash
npm run build

# Verify dist/ exists
ls -la dist/index.html
```

### Step 1.3: Verify Files Exist Locally

```bash
ls -la docker-compose.yml
ls -la docker/Dockerfile.app
ls -la docker/nginx/nginx.conf
ls -la docker/wordpress/wp-config-extra.php
ls -la docker/mariadb/my.cnf
ls -la .env.production
ls -la dist/index.html
```

---

## PHASE 2: UPLOAD TO GCP VM

### Step 2.1: Get Your GCP VM Details

```bash
# From GCP Console:
# - VM Name: (e.g., digitalscout-prod)
# - Zone: (e.g., us-central1-a)
# - External IP: (e.g., 34.123.45.67)

# Store these:
export VM_NAME="digitalscout-prod"
export VM_ZONE="us-central1-a"
export VM_IP="34.123.45.67"  # Your actual VM IP
```

### Step 2.2: Upload Files (Using gcloud)

**EXACT COMMAND:**

```bash
gcloud compute scp --recurse \
  --exclude='.git/*' \
  --exclude='node_modules/*' \
  --exclude='.env.local' \
  ./ ${VM_NAME}:/opt/digitalscout/ \
  --zone=${VM_ZONE}
```

**This uploads:**

- docker-compose.yml
- docker/ folder (all configs)
- src/ folder
- dist/ folder (frontend build)
- .env.production
- Everything else needed

**Verify upload (should take 30-60 seconds):**

```bash
gcloud compute ssh ${VM_NAME} --zone=${VM_ZONE} -- \
  "ls -la /opt/digitalscout/docker-compose.yml"
```

---

## PHASE 3: SSH INTO VM

```bash
gcloud compute ssh ${VM_NAME} --zone=${VM_ZONE}

# You should now be logged into: ubuntu@vm-name:~$

# Go to app directory
cd /opt/digitalscout

# Verify structure
ls -la
```

**EXPECTED OUTPUT:**

```
-rw-r--r--  docker-compose.yml
drwxr-xr-x  docker/
drwxr-xr-x  dist/
-rw-r--r--  .env.production
...
```

---

## PHASE 4: VERIFY DOCKER INSTALLATION (On VM)

```bash
# Check Docker
docker --version

# Check Docker Compose
docker-compose --version

# Check daemon running
sudo systemctl status docker

# If not running:
sudo systemctl start docker
```

---

## PHASE 5: CREATE DIRECTORY STRUCTURE (On VM)

```bash
cd /opt/digitalscout

# Create SSL directory (will be filled in next phase)
mkdir -p docker/nginx/ssl

# Verify structure
ls -la docker/
```

**EXPECTED DIRECTORIES:**

```
docker/
├── Dockerfile.app
├── nginx/
│   ├── nginx.conf
│   └── ssl/           ← Empty now, will add certs
├── wordpress/
│   ├── wp-config-extra.php
│   └── digital-scout-base-theme/
└── mariadb/
    └── my.cnf
```

---

## PHASE 6: CONFIGURE SSL CERTIFICATES (On VM)

### Option A: Let's Encrypt (Recommended)

```bash
cd /opt/digitalscout

# Install certbot
sudo apt-get update -qq
sudo apt-get install -y certbot

# Generate certificate
# REPLACE: your-domain.com with your actual domain
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  --agree-tos \
  --email admin@your-domain.com \
  --non-interactive

# Copy to app directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem \
  /opt/digitalscout/docker/nginx/ssl/cert.pem

sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem \
  /opt/digitalscout/docker/nginx/ssl/key.pem

# Fix permissions
sudo chown 1000:1000 /opt/digitalscout/docker/nginx/ssl/*
chmod 600 /opt/digitalscout/docker/nginx/ssl/key.pem

# Verify
ls -la /opt/digitalscout/docker/nginx/ssl/
```

### Option B: Self-Signed (Testing Only)

```bash
cd /opt/digitalscout

# Generate self-signed cert
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout docker/nginx/ssl/key.pem \
  -out docker/nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Org/CN=your-domain.com"

chmod 600 docker/nginx/ssl/key.pem

# Verify
ls -la docker/nginx/ssl/
```

**EITHER WAY - VERIFY:**

```bash
# Both files should exist
ls -la /opt/digitalscout/docker/nginx/ssl/cert.pem
ls -la /opt/digitalscout/docker/nginx/ssl/key.pem
```

---

## PHASE 7: DNS CONFIGURATION (At Domain Registrar, NOT On VM)

**DO THIS NOW** (DNS propagation takes 5-30 minutes)

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Find DNS settings
3. Update/Create A records:

**Exact steps:**

```
Name: your-domain.com (or @ symbol)
Type: A
Value: 34.123.45.67  ← Your VM's external IP
TTL: 300 (or minimum)
Save

---

Name: www
Type: A
Value: 34.123.45.67
TTL: 300
Save
```

**Verify DNS from your local machine** (run in ~5 min):

```bash
nslookup your-domain.com
# Should show: 34.123.45.67
```

---

## PHASE 8: BUILD DOCKER IMAGE (On VM)

```bash
cd /opt/digitalscout

# Build the Node/Express image
docker-compose build app

# Wait for build to complete
# Should show: "Successfully built xxxxxxx"
```

---

## PHASE 9: START DOCKER COMPOSE (On VM)

```bash
cd /opt/digitalscout

# Start all services in background
docker-compose --env-file .env.production up -d

# Wait 10 seconds for services to start
sleep 10

# Check status
docker-compose ps
```

**EXPECTED OUTPUT:**

```
NAME                    STATE           PORTS
nginx                   Up (healthy)    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
app                     Up (healthy)    5001/tcp
wordpress               Up (healthy)    9000/tcp
mariadb                 Up (healthy)    3306/tcp
```

**If any service is "Restarting", check logs:**

```bash
docker-compose logs nginx
docker-compose logs app
docker-compose logs wordpress
docker-compose logs mariadb
```

---

## PHASE 10: WAIT FOR DATABASE INITIALIZATION (On VM)

```bash
# Database takes ~30 seconds to be ready
# Monitor initialization
docker-compose logs mariadb

# Wait for this message:
# "ready for connections"

# Then check again
docker-compose ps

# All should show: "Up (healthy)"
```

---

## PHASE 11: VERIFY BASIC CONNECTIVITY (From Your Local Machine)

```bash
# Test from your local machine (NOT VM terminal)

# 1. Test HTTP redirect to HTTPS
curl -L http://your-domain.com/health

# 2. Test backend health (accept SSL warning for now)
curl -k https://your-domain.com/health
# Should return: {"status":"ok"}

# 3. Test frontend loads
curl -k https://your-domain.com/ | grep -c "index.html"
# Should return: 1 or higher

# 4. Test WordPress is accessible
curl -k https://your-domain.com/wp-admin/ | grep -c "wp-login"
# Should return: 1 or higher
```

---

## PHASE 12: ACCESS WORDPRESS ADMIN (From Your Browser)

1. Open: `https://your-domain.com/wp-admin/`
2. Ignore SSL warning (if self-signed), click "Proceed"
3. Log in:
   - Username: Read from .env.production `WORDPRESS_MULTISITE_NETWORK_USERNAME`
   - Password: Initial WordPress password (check .env.production)

**If login fails:**

```bash
# Check WordPress logs
docker-compose logs wordpress

# Check database connection
docker-compose exec -T mariadb mysql \
  -u root -p${MARIADB_ROOT_PASSWORD} \
  -e "SHOW DATABASES;"
```

---

## PHASE 13: VERIFY WORDPRESS MULTISITE (In Browser)

1. After login, go to: **Settings > Network Settings**
2. Verify:
   - ✓ "Network Title" = "Digital Scout"
   - ✓ "Network Admin Email" = your email
   - ✓ Selected option: "Sub-directories" (NOT "Sub-domains")

**If not showing multisite:**

```bash
# Restart WordPress
docker-compose restart wordpress

# Wait 10 seconds
sleep 10

# Try accessing again
```

---

## PHASE 14: ACTIVATE PROVISIONING PLUGIN (In Browser)

1. Go to: **My Sites > Network Admin > Plugins**
2. Find: "Digital Scout Multisite MVP Provisioner"
3. Click: **Network Activate**

**If plugin not visible:**

```bash
# Check if plugin directory exists on VM
docker-compose exec wordpress ls -la /var/www/html/wp-content/plugins/

# Should show: digital-scout-multisite-mvp-provisioner/
```

---

## PHASE 15: CREATE WORDPRESS APPLICATION PASSWORD (In Browser)

1. Stay logged in as Network Admin
2. Go to: **Users > Your Profile** (top right menu)
3. Scroll down to: **Application Passwords**
4. Type name: `Digital Scout API`
5. Click: **Add New Application Password**
6. Copy the generated password (looks like: `xxxx xxxx xxxx xxxx`)

**Save this password!**

---

## PHASE 16: UPDATE .env.production WITH APPLICATION PASSWORD (On VM)

```bash
cd /opt/digitalscout

# Edit the file
nano .env.production

# Find this line:
# WORDPRESS_MULTISITE_NETWORK_APP_PASSWORD=

# Replace with the password you just created:
# WORDPRESS_MULTISITE_NETWORK_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Save (Ctrl+O, Enter, Ctrl+X)
```

---

## PHASE 17: RESTART APP CONTAINER (On VM)

```bash
cd /opt/digitalscout

# Restart app container (uses updated .env.production)
docker-compose restart app

# Wait 5 seconds
sleep 5

# Verify it's running
docker-compose ps app
```

---

## PHASE 18: VERIFY API ENDPOINTS WORK (From Local Machine)

```bash
# Test backend API
curl -k https://your-domain.com/health
# Should return: {"status":"ok"}

# Test generate endpoint
curl -k -X POST https://your-domain.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Business"}'
# Should return JSON with website schema

# If API returns errors, check logs:
# docker-compose logs app
```

---

## PHASE 19: RUN VALIDATION SCRIPT (On VM)

```bash
cd /opt/digitalscout

# Run validation
bash docker/validate-deployment.sh

# Should show:
# ✓ PASS: Docker installed
# ✓ PASS: Docker Compose installed
# ✓ PASS: Docker daemon running
# ... (all passing checks)
# ✓ All critical checks passed!
```

**If failures, review script output and fix issues before continuing.**

---

## PHASE 20: TEST END-TO-END WORKFLOW (In Browser)

1. Open: `https://your-domain.com/`
2. Search for a business (use map/search)
3. Select a business result
4. Click "Generate"
5. Wait for website preview to load
6. Click "Sync to WordPress"
7. Wait for success message

**Then verify:**

```bash
# Check WordPress logs for provisioning success
docker-compose logs app | tail -20

# Look for: "Site provisioned successfully" or similar
```

---

## PHASE 21: VERIFY PROVISIONED SITE (In Browser)

1. Open: `https://your-domain.com/wp-admin/`
2. Go to: **My Sites**
3. New site should appear (e.g., "test-business")
4. Click on it to visit public site
5. Verify content displays

---

## PHASE 22: SET UP AUTOMATED BACKUPS (On VM)

```bash
cd /opt/digitalscout

# Create backup script (already exists)
chmod +x backup-db.sh

# Test manual backup
./backup-db.sh

# Verify backup created
ls -la backups/
# Should show: db_backup_YYYYMMDD_HHMMSS.sql
```

**Schedule automated backups:**

```bash
# Add to crontab (runs daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/digitalscout/backup-db.sh") | crontab -

# Verify
crontab -l | grep backup
```

---

## PHASE 23: CONFIGURE FIREWALL (On VM)

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (critical!)
sudo ufw allow 22/tcp

# Allow HTTP & HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verify rules
sudo ufw status

# Should show:
# 22/tcp     ALLOW
# 80/tcp     ALLOW
# 443/tcp    ALLOW
```

---

## PHASE 24: ENABLE SSL AUTO-RENEWAL (On VM) - Let's Encrypt Only

```bash
# Test renewal works
sudo certbot renew --dry-run

# Enable auto-renewal timer
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify
sudo systemctl status certbot.timer
```

---

## COMMON OPERATIONS (While Running)

### View Service Status

```bash
cd /opt/digitalscout
docker-compose ps
```

### View Real-Time Logs

```bash
cd /opt/digitalscout

# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f wordpress
docker-compose logs -f mariadb
docker-compose logs -f nginx

# Ctrl+C to exit
```

### Restart a Service

```bash
cd /opt/digitalscout

# Restart specific service
docker-compose restart app
docker-compose restart wordpress
docker-compose restart mariadb
docker-compose restart nginx

# Restart all
docker-compose restart
```

### Access Database Directly

```bash
cd /opt/digitalscout

# Get password from .env.production first
grep MARIADB_ROOT_PASSWORD .env.production

# Then:
docker-compose exec mariadb mysql \
  -u root -p${MARIADB_ROOT_PASSWORD} \
  -e "USE digitalscout_wp; SELECT COUNT(*) FROM wp_posts;"
```

### View System Resources

```bash
# Memory
free -h

# Disk space
df -h

# Docker resource usage
docker stats

# Running processes
top
```

---

## TROUBLESHOOTING QUICK FIXES

### Services Won't Start

```bash
cd /opt/digitalscout

# Stop all
docker-compose down

# Check for errors
docker-compose logs

# Start fresh
docker-compose --env-file .env.production up -d
```

### Can't Access Frontend

```bash
# Test Nginx is running
docker-compose ps nginx

# Check Nginx logs
docker-compose logs nginx

# Test locally in container
docker-compose exec nginx curl http://localhost/
```

### API Returns 404

```bash
# Check backend container
docker-compose ps app

# Check logs
docker-compose logs app

# Test API directly in container
docker-compose exec app curl http://localhost:5001/health
```

### WordPress Login Fails

```bash
# Check WordPress PHP-FPM
docker-compose ps wordpress

# Check database connection
docker-compose exec wordpress wp db check --allow-root

# Check WordPress logs
docker-compose logs wordpress
```

### Database Connection Issues

```bash
# Check MariaDB status
docker-compose ps mariadb

# Test connection
docker-compose exec mariadb mysql -u root -p${MARIADB_ROOT_PASSWORD} -e "SELECT 1;"

# Check logs
docker-compose logs mariadb
```

---

## ROLLBACK / RECOVERY

### Stop Everything (Emergency)

```bash
cd /opt/digitalscout
docker-compose down
```

### Restart Everything

```bash
cd /opt/digitalscout
docker-compose --env-file .env.production up -d
```

### Restore from Database Backup

```bash
cd /opt/digitalscout

# List backups
ls -la backups/

# Restore specific backup
docker-compose exec -T mariadb mysql \
  -u root -p${MARIADB_ROOT_PASSWORD} \
  < backups/db_backup_YYYYMMDD_HHMMSS.sql

# Restart services
docker-compose restart wordpress app
```

### Complete System Redeployment

```bash
cd /opt/digitalscout

# Stop and remove containers (keeps volumes)
docker-compose down

# Remove images (forces rebuild on next start)
docker-compose rm -f

# Rebuild and start
docker-compose build app
docker-compose --env-file .env.production up -d
```

---

## EXACT EXECUTION SEQUENCE SUMMARY

**IF FOLLOWING FROM SCRATCH:**

1. ✅ Step 1.1 - Prepare .env.production locally
2. ✅ Step 1.2 - Build frontend locally (npm run build)
3. ✅ Step 2.2 - Upload files to GCP VM (gcloud scp)
4. ✅ Step 3 - SSH into VM
5. ✅ Step 4 - Verify Docker installed
6. ✅ Step 5 - Create directories
7. ✅ Step 6 - Configure SSL (Let's Encrypt or self-signed)
8. ✅ Step 7 - Update DNS at registrar (WAIT 5-30 minutes)
9. ✅ Step 8 - Build Docker image (docker-compose build)
10. ✅ Step 9 - Start Docker Compose (docker-compose up -d)
11. ✅ Step 10 - Wait for DB initialization
12. ✅ Step 11 - Test from local machine (curl commands)
13. ✅ Step 12 - Access WordPress admin
14. ✅ Step 13 - Verify multisite settings
15. ✅ Step 14 - Activate provisioning plugin
16. ✅ Step 15 - Create application password
17. ✅ Step 16 - Update .env.production
18. ✅ Step 17 - Restart app container
19. ✅ Step 18 - Test API endpoints
20. ✅ Step 19 - Run validation script
21. ✅ Step 20 - Test end-to-end workflow
22. ✅ Step 21 - Verify provisioned site works
23. ✅ Step 22 - Set up automated backups
24. ✅ Step 23 - Configure firewall
25. ✅ Step 24 - Enable SSL auto-renewal

**DEPLOYMENT COMPLETE ✅**

---

## IMPORTANT NOTES

- **Do NOT skip Step 6** (SSL setup) - HTTPS required
- **Do NOT skip Step 7** (DNS) - Give 5 minutes between steps 7-9
- **Do NOT skip Step 22** (Backups) - Critical for data safety
- **Save passwords** from Step 16 in secure location
- **Keep .env.production secure** - Never share or commit to git

---

**DEPLOYMENT STARTS IMMEDIATELY AFTER YOU:**

1. Fill in .env.production with real API keys
2. Have your domain ready with registrar access
3. SSH access to GCP VM confirmed
