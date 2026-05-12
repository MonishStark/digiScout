<!-- @format -->

# Digital Scout - GCP Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the complete Digital Scout application stack to a GCP Compute Engine VM using Docker Compose.

**Architecture:**

- Nginx reverse proxy (port 80/443)
- Express.js backend (port 5001, internal)
- WordPress Multisite CMS (port 9000, internal)
- MariaDB database (port 3306, internal)
- React frontend (served via Nginx)

---

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] GCP VM running Ubuntu 22.04 LTS (e2-micro)
- [ ] Docker installed and running
- [ ] Docker Compose installed
- [ ] SSH access to the VM
- [ ] Domain name purchased and DNS access
- [ ] All required API keys obtained (Gemini, Google Maps, Netlify, CallHippo)
- [ ] SSL certificates prepared or ready to generate with Let's Encrypt
- [ ] Database backup strategy planned

---

## Folder Structure on VM

Create the following folder structure on your GCP VM:

```
/opt/digitalscout/
├── docker/
│   ├── nginx/
│   │   ├── nginx.conf              (Nginx configuration)
│   │   └── ssl/                    (SSL certificates directory)
│   ├── wordpress/
│   │   ├── wp-config-extra.php     (WordPress multisite config)
│   │   └── digital-scout-base-theme/
│   ├── mariadb/
│   │   └── my.cnf                  (MariaDB configuration)
│   └── Dockerfile.app              (Node/Express Dockerfile)
├── docker-compose.yml              (Main Docker Compose file)
├── .env.production                 (Production environment variables)
├── dist/                           (Built React frontend)
├── src/                            (Source code)
├── wordpress/                      (WordPress plugins)
│   └── multisite-mvp-provisioner/
└── scripts/
    └── deploy.sh                   (Deployment script)
```

---

## Step 1: Prepare Environment Variables

### 1.1 Generate Secure Passwords

SSH into your GCP VM and generate strong passwords:

```bash
# Generate WordPress database password
WORDPRESS_DB_PASSWORD=$(openssl rand -base64 32)
echo "WORDPRESS_DB_PASSWORD=$WORDPRESS_DB_PASSWORD"

# Generate MariaDB root password
MARIADB_ROOT_PASSWORD=$(openssl rand -base64 32)
echo "MARIADB_ROOT_PASSWORD=$MARIADB_ROOT_PASSWORD"
```

### 1.2 Create WordPress Application Password

1. Log in to WordPress admin panel (after initial setup)
2. Go to: Users > Your Profile
3. Scroll to "Application Passwords"
4. Create a new application password named "Digital Scout API"
5. Copy the generated password

### 1.3 Set Up Environment File

On your local machine:

```bash
# Copy the example file
cp .env.production.example .env.production

# Edit the file with your values
nano .env.production
```

Fill in the following:

```bash
# External APIs
GEMINI_API_KEY=your_actual_gemini_key
GOOGLE_MAPS_PLATFORM_KEY=your_actual_maps_key
VITE_NETLIFY_TOKEN=your_actual_netlify_token
CALLHIPPO_API_KEY=your_actual_callhippo_key

# WordPress & Database (use generated passwords from Step 1.1)
WORDPRESS_DB_NAME=digitalscout_wp
WORDPRESS_DB_USER=wp_user
WORDPRESS_DB_PASSWORD=<generated_password>
WORDPRESS_MULTISITE_NETWORK_USERNAME=network-admin
WORDPRESS_MULTISITE_NETWORK_APP_PASSWORD=<app_password_from_wp_admin>
MARIADB_ROOT_PASSWORD=<generated_password>

# Domain
APP_DOMAIN=your-domain.com
APP_DOMAIN_EMAIL=admin@your-domain.com
```

---

## Step 2: Prepare Application for Deployment

### 2.1 Build the Frontend

On your local machine:

```bash
# Build the React frontend for production
npm run build

# This creates the dist/ directory with optimized assets
```

### 2.2 Upload Files to GCP VM

```bash
# SSH into your GCP VM
gcloud compute ssh your-instance-name --zone=us-central1-a

# Create deployment directory
mkdir -p /opt/digitalscout
cd /opt/digitalscout

# Go back to local machine
exit

# Upload files from local machine
gcloud compute scp --recurse . your-instance-name:/opt/digitalscout/ \
  --zone=us-central1-a \
  --exclude='.git/*' \
  --exclude='node_modules/*' \
  --exclude='.env.local'
```

Or use rsync:

```bash
rsync -av --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.env.local' \
  ./ your-vm-ip:/opt/digitalscout/
```

### 2.3 Verify Files on VM

```bash
ssh your-vm-ip

# Verify the structure
cd /opt/digitalscout
ls -la
```

---

## Step 3: Configure SSL/HTTPS

### 3.1 Option A: Using Let's Encrypt (Recommended)

```bash
# SSH into VM
ssh your-vm-ip
cd /opt/digitalscout

# Create SSL directory
mkdir -p docker/nginx/ssl

# Install certbot
sudo apt-get update && sudo apt-get install -y certbot

# Generate certificates
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  --agree-tos \
  --email admin@your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/nginx/ssl/key.pem

# Set permissions
sudo chown 1000:1000 docker/nginx/ssl/*
chmod 600 docker/nginx/ssl/key.pem
```

### 3.2 Option B: Using Self-Signed Certificates (Development Only)

```bash
# SSH into VM
ssh your-vm-ip
cd /opt/digitalscout

# Create SSL directory
mkdir -p docker/nginx/ssl

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout docker/nginx/ssl/key.pem \
  -out docker/nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"

# Set permissions
chmod 600 docker/nginx/ssl/key.pem
```

---

## Step 4: Configure DNS

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Update DNS A records to point to your GCP VM's external IP:

```
Domain: your-domain.com
A Record: your-gcp-vm-external-ip

Subdomain: www
A Record: your-gcp-vm-external-ip (optional)

Subdomain: *.cms (for WordPress subdomains, if using subdomain multisite)
A Record: your-gcp-vm-external-ip (optional - only if using subdomain mode)
```

Wait for DNS propagation (5-30 minutes).

---

## Step 5: Deploy with Docker Compose

### 5.1 Verify Docker is Running

```bash
ssh your-vm-ip

# Check Docker status
sudo systemctl status docker

# If not running, start it
sudo systemctl start docker

# Check Docker Compose
docker-compose --version
```

### 5.2 Prepare Environment File

```bash
cd /opt/digitalscout

# Copy and edit the environment file
cp .env.production.example .env.production

# Edit with your values
sudo nano .env.production
```

### 5.3 Build and Start Containers

```bash
# Build the Node/Express app image
docker-compose build app

# Start all services in detached mode
docker-compose --env-file .env.production up -d

# View logs
docker-compose logs -f

# Check status of all services
docker-compose ps
```

### 5.4 Wait for Services to Initialize

```bash
# Wait ~30 seconds for database to initialize, then check health
sleep 30
docker-compose ps

# All services should show "healthy" or "up" status
```

---

## Step 6: Initialize WordPress Multisite

### 6.1 Access WordPress Admin

1. Open your browser to: `https://your-domain.com/wp-admin/`
2. Log in with the credentials you set up

### 6.2 Verify Multisite Configuration

1. Go to Settings > Network Settings
2. Verify:
   - Network Title: Digital Scout
   - Network Admin Email: admin@your-domain.com
   - Subdirectory Installation (not Subdomains)

### 6.3 Activate the Provisioning Plugin

1. Go to My Sites > Network Admin > Plugins
2. Find "Digital Scout Multisite MVP Provisioner"
3. Click "Network Activate"

### 6.4 Create Application Password

1. Go to Users > Your Profile (on main site)
2. Scroll to "Application Passwords"
3. Create a new application password: "Digital Scout API"
4. Copy the password and update `.env.production`:
   ```bash
   WORDPRESS_MULTISITE_NETWORK_APP_PASSWORD=<new_password>
   ```
5. Restart the app container:
   ```bash
   docker-compose restart app
   ```

---

## Step 7: Verify Deployment

### 7.1 Health Check Endpoints

```bash
# Check backend health
curl https://your-domain.com/health

# Should return: {"status":"ok"}
```

### 7.2 Test API Endpoints

```bash
# Test a simple API call
curl -X POST https://your-domain.com/api/qualify-leads \
  -H "Content-Type: application/json" \
  -d '{"businesses": []}'
```

### 7.3 Verify Frontend Loads

1. Open `https://your-domain.com/` in your browser
2. Map should load
3. Search functionality should work
4. No console errors in browser DevTools

### 7.4 Verify WordPress Works

1. Open `https://your-domain.com/wp-admin/` in your browser
2. Log in to WordPress
3. Navigate to Plugins > Installed Plugins
4. Verify "Digital Scout Multisite MVP Provisioner" is active

### 7.5 Test WordPress Provisioning

Use the app to generate and provision a test site:

1. Search for businesses
2. Select one and click "Generate"
3. Click "Sync to WordPress"
4. Check WordPress Sites to see the new subsite created

---

## Step 8: Configure Monitoring & Backups

### 8.1 Set Up Database Backups

```bash
# Create backup script
cat > /opt/digitalscout/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/digitalscout/backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup database
docker-compose exec -T mariadb mysqldump \
  -u root -p${MARIADB_ROOT_PASSWORD} \
  --all-databases > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
EOF

chmod +x /opt/digitalscout/backup-db.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/digitalscout/backup-db.sh") | crontab -
```

### 8.2 Set Up Log Rotation

```bash
# Logs are stored in docker volumes
docker-compose logs app     # View app logs
docker-compose logs wordpress  # View WordPress logs
docker-compose logs mariadb    # View database logs

# For persistent log analysis, mount logs to host directory
# (Already configured in docker-compose.yml)
```

### 8.3 Monitor Container Health

```bash
# View health status
docker-compose ps

# If a service is unhealthy, restart it
docker-compose restart service_name

# View logs for a specific service
docker-compose logs service_name
```

---

## Step 9: Post-Deployment Configuration

### 9.1 Configure WordPress Permalinks

1. Log in to WordPress: `https://your-domain.com/wp-admin/`
2. Go to Settings > Permalinks
3. Select "Post name" option
4. Click Save

### 9.2 Activate Required WordPress Plugins

1. Go to My Sites > Network Admin > Plugins
2. Activate:
   - Digital Scout Multisite MVP Provisioner (network-wide)
   - Any desired WordPress plugins (per-site)

### 9.3 Configure WordPress Media Settings

1. Go to Settings > Media
2. Update media upload path to point to persistent volume
3. Test file upload by uploading an image

### 9.4 Set Up SMTP for Email

Consider setting up transactional email for:

- Password reset emails
- Site notifications
- Admin notifications

Recommended services:

- SendGrid (free tier available)
- MailerSend
- AWS SES

---

## Step 10: Security Hardening

### 10.1 Configure Firewall Rules

```bash
# SSH into VM
ssh your-vm-ip

# Update iptables to allow only necessary traffic
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 5001/tcp   # Block direct access to backend
```

### 10.2 Limit Access to WordPress Admin

In `docker/nginx/nginx.conf`, optionally add IP whitelisting:

```nginx
# Only allow access to wp-admin from specific IPs
location ~ ^/wp-admin/ {
    allow 203.0.113.0/24;  # Your office network
    deny all;
    # ... proxy settings
}
```

### 10.3 Configure SSL/TLS Renewal

For Let's Encrypt certificates, set up auto-renewal:

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Schedule renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs -f

# Check specific service
docker-compose logs wordpress

# Restart all services
docker-compose restart

# Force recreate all containers
docker-compose up -d --force-recreate
```

### Database Connection Issues

```bash
# Check MariaDB container
docker-compose logs mariadb

# Test database connection from host
docker-compose exec -T app mysql \
  -h mariadb -u wp_user -p${WORDPRESS_DB_PASSWORD} \
  -e "SELECT VERSION();"
```

### WordPress Multisite Issues

1. Check `/var/www/html/wp-config.php` inside WordPress container:

   ```bash
   docker-compose exec wordpress cat /var/www/html/wp-config.php | grep -i multisite
   ```

2. Verify multisite constants in WordPress admin
3. Clear WordPress cache if using any cache plugins
4. Check WordPress error logs

### API Endpoints Return 404

1. Verify Nginx proxy configuration
2. Check if backend container is running: `docker-compose ps app`
3. Check backend logs: `docker-compose logs app`
4. Verify API endpoint exists in `server.ts`

### SSL Certificate Issues

```bash
# View certificate details
openssl x509 -in docker/nginx/ssl/cert.pem -text -noout

# Test SSL configuration
openssl s_client -connect your-domain.com:443

# If using Let's Encrypt, check renewal
sudo certbot renew --dry-run
```

---

## Maintenance Tasks

### Regular Backups

```bash
# Manual backup
/opt/digitalscout/backup-db.sh

# Restore from backup
docker-compose exec -T mariadb mysql \
  -u root -p${MARIADB_ROOT_PASSWORD} < backups/db_backup_YYYYMMDD_HHMMSS.sql
```

### Update Images

```bash
# Pull latest official images
docker-compose pull

# Rebuild custom images
docker-compose build --no-cache

# Apply updates
docker-compose up -d
```

### Monitor Disk Space

```bash
# Check disk usage
df -h

# Check Docker volume usage
docker system df

# Clean up unused images/containers
docker system prune -a
```

---

## Scaling Considerations

If you need to scale beyond the e2-micro VM:

1. **Upgrade VM size**: Change machine type to e2-small, e2-medium, etc.
2. **Separate database**: Move MariaDB to Cloud SQL
3. **Static storage**: Use Cloud Storage for WordPress uploads
4. **CDN**: Use Cloud CDN for frontend assets
5. **Load balancing**: Use Cloud Load Balancer for traffic distribution

---

## Support and Documentation

- **Docker Compose**: https://docs.docker.com/compose/
- **WordPress Multisite**: https://wordpress.org/support/article/create-a-network/
- **Nginx**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **GCP Compute Engine**: https://cloud.google.com/compute/docs

---

## Production Deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] DNS records updated and propagated
- [ ] Docker Compose file reviewed
- [ ] All services starting successfully
- [ ] Frontend loads without errors
- [ ] API endpoints responding
- [ ] WordPress admin accessible
- [ ] Multisite plugin activated
- [ ] Database backups scheduled
- [ ] Logs being collected
- [ ] Firewall rules configured
- [ ] SSL/TLS renewal scheduled
- [ ] Monitoring set up
- [ ] Team notified of production URL

---

**Deployment Date**: [Date of deployment]
**Deployed By**: [Your name]
**Production URL**: https://your-domain.com
