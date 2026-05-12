<!-- @format -->

# Digital Scout - Deployment Timeline & Expectations

---

## TOTAL ESTIMATED TIME

**Local Preparation**: 15-30 minutes
**Upload to GCP**: 2-5 minutes  
**SSL Setup**: 3-5 minutes (Let's Encrypt) or 2 minutes (self-signed)
**DNS Wait Time**: 5-30 minutes (unavoidable)
**Docker Deployment**: 5-10 minutes
**WordPress Initialization**: 5-10 minutes
**Testing & Verification**: 10-15 minutes
**Hardening & Setup**: 5-10 minutes

**TOTAL: 50 minutes to 2 hours** _(Most time is DNS propagation, which happens passively)_

---

## EXECUTION TIMELINE

### Minutes 0-15: Local Machine Preparation

```
TIME: 0-2 min    Generate passwords locally
TIME: 2-5 min    Create .env.production and fill in API keys
TIME: 5-10 min   Run: npm run build (frontend)
TIME: 10-12 min  Verify files exist locally
TIME: 12-15 min  Set environment variables for GCP access
```

### Minutes 15-20: Upload to GCP

```
TIME: 15-20 min  Run gcloud scp to upload files
                 (2-5 min actual, but verify takes time)
```

### Minutes 20-28: SSL Certificate Configuration

```
TIME: 20-23 min  SSH to VM, create directories
TIME: 23-25 min  Install certbot (or openssl for self-signed)
TIME: 25-28 min  Generate SSL certificates
                 (Let's Encrypt interactive, 2-3 min)
                 (Self-signed instant)
```

### Minutes 28-35: DNS Configuration (Happens in Parallel)

```
TIME: 28-33 min  Update DNS records at registrar
TIME: 33-38 min  WAIT for DNS propagation (5 minutes minimum)
                 Can do other tasks during this time
                 (Up to 30 minutes worst case)
```

### Minutes 35-50: Docker Deployment

```
TIME: 38-42 min  Docker build app image (4-5 min)
TIME: 42-45 min  Start Docker Compose services
TIME: 45-48 min  Wait for database initialization
TIME: 48-50 min  Verify all services healthy
```

### Minutes 50-65: WordPress Setup

```
TIME: 50-52 min  Access WordPress admin
TIME: 52-55 min  Verify multisite settings
TIME: 55-58 min  Activate provisioning plugin
TIME: 58-62 min  Create application password
TIME: 62-65 min  Update .env.production and restart app
```

### Minutes 65-80: Testing & Verification

```
TIME: 65-68 min  Test API endpoints
TIME: 68-70 min  Run validation script
TIME: 70-75 min  End-to-end workflow test
TIME: 75-78 min  Verify provisioned site
TIME: 78-80 min  Review logs for errors
```

### Minutes 80-90: Production Hardening

```
TIME: 80-83 min  Set up automated backups
TIME: 83-85 min  Configure firewall
TIME: 85-90 min  Enable SSL auto-renewal
```

---

## WHAT HAPPENS AT EACH STAGE

### Stage 1: Local Preparation (15-30 min)

**What's Happening:**

- Generating secure passwords for database
- Filling in API keys from external services
- Building React frontend into optimized dist/ folder
- Preparing upload bundle

**Expected Output:**

```
✅ .env.production filled with real values
✅ dist/index.html created (500+ KB)
✅ Ready to upload
```

**If Something Goes Wrong:**

- API keys invalid → deployment will start but features won't work
- Build fails → check npm output, usually missing dependencies
- .env formatting wrong → Docker will fail with clear error

---

### Stage 2: Upload (2-5 min)

**What's Happening:**

- Transferring ~200-300 MB of files to GCP VM
- Copying: docker configs, source code, built frontend

**Expected Output:**

```
gcloud compute scp ... [complete after 2-5 min]
✅ Files verified on VM
```

**If Something Goes Wrong:**

- SSH access denied → check GCP firewall rules
- File permissions → might need sudo
- Retry gcloud scp command

---

### Stage 3: SSL Setup (2-5 min)

**What's Happening:**

- Let's Encrypt: Generating trusted certificate (requires internet)
- Self-signed: Generating untrusted certificate (instant)

**Expected Output - Let's Encrypt:**

```
Successfully received certificate
✅ cert.pem and key.pem in docker/nginx/ssl/
```

**Expected Output - Self-Signed:**

```
Certificate written to PEM file
✅ Instant, self-signed cert created
```

**If Something Goes Wrong:**

- Port 80 blocked → certbot can't verify domain ownership
- Domain doesn't resolve yet → wait for DNS to propagate first
- Permission denied → use sudo

---

### Stage 4: DNS Configuration (5-30 min, Passive)

**What's Happening:**

- Domain registrar updating nameserver records
- Information propagating globally through DNS servers
- No active waiting needed

**Expected Output:**

```
After 5-30 minutes:
$ nslookup your-domain.com
# Shows your GCP VM's IP address
```

**If Something Goes Wrong:**

- Still resolving to old IP → wait longer
- Wrong IP → check registrar DNS settings
- TTL was high (3600+) → wait up to 1 hour

---

### Stage 5: Docker Deployment (5-10 min)

**What's Happening:**

- Building custom Express app Docker image
- Starting 4 containers: nginx, app, wordpress, mariadb
- Running health checks on each service
- Initializing MariaDB database (takes longest)

**Expected Output - Build:**

```
Building app
...
Successfully built 1234567890abc
```

**Expected Output - Deploy:**

```
Creating digitalscout_mariadb_1
Creating digitalscout_app_1
Creating digitalscout_wordpress_1
Creating digitalscout_nginx_1

docker-compose ps
NAME         STATE           STATUS
nginx        up              healthy
app          up              healthy
wordpress    up              healthy
mariadb      up              healthy
```

**If Something Goes Wrong:**

- MariaDB keeps restarting → check logs for database errors
- App can't connect to WordPress → wait longer for DB init
- Nginx won't start → check port 80/443 availability
- Memory issues → e2-micro might be too small

---

### Stage 6: WordPress Access (2-5 min)

**What's Happening:**

- Accessing WordPress admin panel for first time
- Verifying multisite configuration
- Activating provisioning plugin

**Expected Output:**

```
✅ WordPress admin accessible
✅ Network menu visible
✅ Plugins menu accessible
✅ Plugin can be activated
```

**If Something Goes Wrong:**

- 502 Bad Gateway → app container isn't responding
- Database error → MariaDB not initialized yet
- Can't login → check credentials in .env.production
- Multisite not showing → WordPress needs to be restarted

---

### Stage 7: Application Password Setup (1-2 min)

**What's Happening:**

- Creating a secure app password in WordPress
- This allows Express backend to access WordPress API

**Expected Output:**

```
✅ New application password generated: xxxx xxxx xxxx xxxx
✅ Copy this password
✅ Put in .env.production
✅ Restart app container
```

**If Something Goes Wrong:**

- "Application Passwords" section not visible → update WordPress
- Can't create password → verify user permissions
- App still can't connect → verify password in .env is correct

---

### Stage 8: API Testing (2-3 min)

**What's Happening:**

- Testing backend API endpoints
- Verifying Express server is responding
- Checking database connectivity

**Expected Output:**

```
curl https://your-domain.com/health
{"status":"ok"}

curl https://your-domain.com/api/generate
{"theme":{...},"meta":{...}}  ← Website schema
```

**If Something Goes Wrong:**

- 404 → endpoint path wrong
- 500 → backend error, check logs
- Timeout → backend not running

---

### Stage 9: End-to-End Test (5-10 min)

**What's Happening:**

- Using the full application workflow
- Searching for businesses
- Generating website
- Provisioning to WordPress
- Verifying new site created

**Expected Output:**

```
✅ Business search returns results
✅ Generate creates website preview
✅ Provisioning succeeds
✅ New subsite created in WordPress
✅ Subsite publicly accessible
```

**If Something Goes Wrong:**

- No search results → Google Maps API key missing
- Generate fails → Gemini API key missing or invalid
- Provisioning fails → check app logs for error
- Subsite not accessible → WordPress multisite config issue

---

### Stage 10: Hardening (5-10 min)

**What's Happening:**

- Setting up daily automated database backups
- Configuring UFW firewall
- Enabling SSL certificate auto-renewal

**Expected Output:**

```
✅ First backup created: db_backup_YYYYMMDD_HHMMSS.sql
✅ Firewall enabled with rules for 22, 80, 443
✅ SSL renewal scheduled
```

**If Something Goes Wrong:**

- Backup fails → check MariaDB access
- Firewall blocks SSH → oops! Use GCP console to fix
- Renewal fails → certbot misconfigured

---

## MONITORING DEPLOYMENT

### How to Know It's Working

**Nginx:**

```bash
curl -k https://your-domain.com/
# Should return HTML (frontend)
```

**Express API:**

```bash
curl -k https://your-domain.com/api/health
# Should return: {"status":"ok"}
```

**WordPress:**

```bash
curl -k https://your-domain.com/wp-admin/
# Should return login page HTML
```

**MariaDB:**

```bash
docker-compose exec -T mariadb mysql -e "SELECT 1;"
# Should return: 1
```

### How to Watch Progress

**See all logs:**

```bash
docker-compose logs -f
# Ctrl+C to exit
```

**See specific service:**

```bash
docker-compose logs -f app
docker-compose logs -f wordpress
docker-compose logs -f mariadb
```

**Check service status:**

```bash
docker-compose ps
# All should show "healthy" or "up"
```

---

## WHAT TO DO IF DEPLOYMENT FAILS

### If Docker Won't Start Services

```bash
# Stop everything
docker-compose down

# Check for errors
docker-compose logs

# Look for specific error message
# Common errors:
# - "port already in use" → another app using 80/443
# - "database connect failed" → MariaDB not initialized
# - "permission denied" → file permission issues
```

### If API Returns 404

```bash
# Check app is running
docker-compose ps app

# Check app logs
docker-compose logs app

# Verify endpoint exists in code
# Check Nginx routing in docker/nginx/nginx.conf
```

### If WordPress Won't Load

```bash
# Check WordPress container
docker-compose ps wordpress

# Check database connectivity
docker-compose logs mariadb

# Restart WordPress
docker-compose restart wordpress wordpress
```

### If DNS Not Resolving

```bash
# Wait more time (usually 5-15 minutes)
nslookup your-domain.com

# Check DNS records at registrar
# Verify A records are correct
# Check TTL (if high, may take 1 hour)
```

### If SSL Certificate Fails

```bash
# Check certificate
openssl x509 -in docker/nginx/ssl/cert.pem -text

# Check Nginx config
cat docker/nginx/nginx.conf | grep ssl

# Restart Nginx
docker-compose restart nginx
```

---

## ROLLBACK PROCEDURE

If something goes seriously wrong:

```bash
# 1. Stop everything (SAFE)
docker-compose down

# 2. Inspect what went wrong
docker-compose logs > /tmp/error.log

# 3. Option A: Fix and restart
# Fix the issue in .env.production or config files
docker-compose up -d

# 3. Option B: Full reset
docker-compose rm -f
docker-compose build app
docker-compose --env-file .env.production up -d

# 3. Option C: Restore from backup
docker-compose exec -T mariadb mysql \
  -u root -p${MARIADB_ROOT_PASSWORD} \
  < backups/db_backup_YYYYMMDD_HHMMSS.sql
```

**Containers can be restarted. Data in volumes persists. No data is lost.**

---

## POST-DEPLOYMENT CHECKLIST

After successful deployment:

- [ ] Services are healthy (docker-compose ps)
- [ ] Frontend loads (https://your-domain.com/)
- [ ] WordPress admin accessible (https://your-domain.com/wp-admin/)
- [ ] API endpoints respond (/health, /api/generate)
- [ ] End-to-end workflow works (search → generate → provision)
- [ ] Automated backups scheduled (crontab -l | grep backup)
- [ ] Firewall configured (sudo ufw status)
- [ ] SSL renewal enabled (sudo systemctl status certbot.timer)
- [ ] Team trained on operations
- [ ] Documentation reviewed and updated
- [ ] Monitoring set up
- [ ] Runbook created

---

## PERFORMANCE EXPECTATIONS

### Response Times (Normal)

```
Frontend load:    < 2 seconds
API /health:      < 100ms
API /generate:    2-10 seconds (depends on Gemini API)
WordPress login:  1-3 seconds
Database query:   < 100ms
```

### Resource Usage (e2-micro)

```
CPU:       15-30% idle, 50-80% under load
Memory:    700-850 MB in use (some swap normal)
Disk:      ~30-40% used
Network:   Low bandwidth, but sufficient for MVP
```

### Database Size (Initial)

```
WordPress core:   10-20 MB
One generated site: 2-5 MB per site
Backups:          15-30 MB per backup
Total:            Initially ~50-100 MB
```

---

## SUCCESS INDICATORS

**Deployment is successful when:**

1. ✅ All 4 docker services show "healthy"
2. ✅ Frontend loads without errors
3. ✅ WordPress admin accessible
4. ✅ API endpoints return correct responses
5. ✅ Business search works
6. ✅ Website generation works
7. ✅ WordPress provisioning creates sites
8. ✅ Provisioned sites are public
9. ✅ Backups are scheduled
10. ✅ SSL certificate is valid
11. ✅ No error messages in logs
12. ✅ Team can access and use the system

---

**Estimated Total Time: 1-2 hours**

**Most time is DNS propagation (unavoidable) and waiting for services to initialize.**

**Actual hands-on work: ~30 minutes**
