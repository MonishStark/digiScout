<!-- @format -->

# GCP DEPLOYMENT - YOUR COMPLETE GUIDE

## ✅ LOCAL WORK IS DONE

Frontend built ✓
Environment file created ✓
Passwords generated ✓
Everything ready to upload ✓

---

## 📋 STEP 1: GET YOUR VALUES

**You need to provide these 4 things:**

### 1. Gemini API Key

- Go to: https://aistudio.google.com/app/apikeys
- Create a new API key
- Copy the key value

### 2. Google Maps API Key

- Go to: https://console.cloud.google.com/apis/library
- Search for "Places API" and enable it
- Search for "Maps JavaScript API" and enable it
- Go to Credentials > Create API Key
- Copy the key value

### 3. Netlify API Token

- Go to: https://app.netlify.com/user/applications
- Click "New access token"
- Name it: "Digital Scout"
- Copy the token

### 4. CallHippo API Key

- Go to: https://app.callhippo.com/
- Settings > Integrations > API
- Copy your API key

---

## 🔧 STEP 2: EDIT .env.production

**File location:** `c:\Users\Dhanush\Downloads\zip\.env.production`

Open the file and replace these 4 lines:

```
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GOOGLE_MAPS_PLATFORM_KEY=YOUR_GOOGLE_MAPS_KEY_HERE
VITE_NETLIFY_TOKEN=YOUR_NETLIFY_TOKEN_HERE
CALLHIPPO_API_KEY=YOUR_CALLHIPPO_KEY_HERE
```

**Replace with your actual keys:**

```
GEMINI_API_KEY=sk-...yourkeyhere...
GOOGLE_MAPS_PLATFORM_KEY=AIzaSyD...yourkeyhere...
VITE_NETLIFY_TOKEN=nfp_...yourkeyhere...
CALLHIPPO_API_KEY=ch_...yourkeyhere...
```

Also update domain:

```
APP_DOMAIN=your-actual-domain.com
APP_DOMAIN_EMAIL=your-email@domain.com
```

**Save the file.**

---

## 📤 STEP 3: UPLOAD TO GCP VM

**You need your GCP VM details:**

- VM Name: (from GCP Console)
- VM Zone: (from GCP Console, e.g., us-central1-a)
- VM External IP: (from GCP Console)

**Run this command (replace the values):**

```bash
gcloud compute scp --recurse `
  --exclude='.git/*' `
  --exclude='node_modules/*' `
  --exclude='.env.local' `
  'c:\Users\Dhanush\Downloads\zip\' YOUR_VM_NAME:/opt/digitalscout/ `
  --zone=YOUR_VM_ZONE
```

**Example:**

```bash
gcloud compute scp --recurse `
  --exclude='.git/*' `
  --exclude='node_modules/*' `
  --exclude='.env.local' `
  'c:\Users\Dhanush\Downloads\zip\' digitalscout-prod:/opt/digitalscout/ `
  --zone=us-central1-a
```

**Wait for upload to complete (~2-5 minutes)**

---

## 🚀 NOW - EXECUTE THESE EXACT GCP VM COMMANDS

---

### GCP COMMAND #1: SSH Into VM

```bash
gcloud compute ssh YOUR_VM_NAME --zone=YOUR_VM_ZONE
```

**Example:**

```bash
gcloud compute ssh digitalscout-prod --zone=us-central1-a
```

Once connected, you'll see: `ubuntu@vm-name:~$`

---

### GCP COMMAND #2: Navigate to App

```bash
cd /opt/digitalscout
pwd
ls -la
```

---

### GCP COMMAND #3: Verify Docker

```bash
docker --version
docker-compose --version
sudo systemctl status docker
```

---

### GCP COMMAND #4: Create SSL Directory

```bash
mkdir -p docker/nginx/ssl
```

---

### GCP COMMAND #5: Generate SSL Certificate

**Replace `YOUR_DOMAIN_COM` with your actual domain (no https://)**

**Example: your-domain.com**

```bash
sudo apt-get update -qq
sudo apt-get install -y certbot

sudo certbot certonly --standalone \
  -d YOUR_DOMAIN_COM \
  -d www.YOUR_DOMAIN_COM \
  --agree-tos \
  --email admin@YOUR_DOMAIN_COM \
  --non-interactive

sudo cp /etc/letsencrypt/live/YOUR_DOMAIN_COM/fullchain.pem \
  /opt/digitalscout/docker/nginx/ssl/cert.pem

sudo cp /etc/letsencrypt/live/YOUR_DOMAIN_COM/privkey.pem \
  /opt/digitalscout/docker/nginx/ssl/key.pem

sudo chown 1000:1000 /opt/digitalscout/docker/nginx/ssl/*
chmod 600 /opt/digitalscout/docker/nginx/ssl/key.pem

ls -la /opt/digitalscout/docker/nginx/ssl/
```

---

## ⏸️ PAUSE HERE - UPDATE DNS AT YOUR REGISTRAR

**Important:** Do this BEFORE continuing

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Find DNS settings
3. Create/Update A records:

```
Name: your-domain.com (or @ symbol)
Type: A
Value: YOUR_GCP_VM_EXTERNAL_IP
TTL: 300

---

Name: www
Type: A
Value: YOUR_GCP_VM_EXTERNAL_IP
TTL: 300
```

Save changes.

**Wait 5 minutes for DNS to propagate.**

---

### GCP COMMAND #6: Build Docker Image (Still on VM)

```bash
cd /opt/digitalscout
docker-compose build app
```

Wait for: "Successfully built ..."

---

### GCP COMMAND #7: Start All Services

```bash
cd /opt/digitalscout
docker-compose --env-file .env.production up -d
sleep 10
docker-compose ps
```

**Expected output - all showing "healthy":**

```
NAME         STATE           STATUS
nginx        up              healthy
app          up              healthy
wordpress    up              healthy
mariadb      up              healthy
```

**If MariaDB is "restarting", wait 30 seconds and run `docker-compose ps` again**

---

### GCP COMMAND #8: Wait for Database

```bash
docker-compose logs mariadb
```

Wait for: "ready for connections"

Then:

```bash
sleep 30
docker-compose ps
```

All should show healthy.

---

## ✅ TEST FROM YOUR LOCAL MACHINE

**Open a new terminal on your local machine (NOT on the VM):**

### LOCAL TEST #1: Health Check

```bash
curl -k https://YOUR_DOMAIN_COM/health
```

Should return:

```json
{ "status": "ok" }
```

### LOCAL TEST #2: Frontend

```bash
curl -k https://YOUR_DOMAIN_COM/ | findstr "index"
```

Should find: index.html

### LOCAL TEST #3: WordPress

```bash
curl -k https://YOUR_DOMAIN_COM/wp-admin/ | findstr "wp-login"
```

Should find: wp-login

---

## 🌐 OPEN WORDPRESS ADMIN (In Browser)

1. Open: `https://YOUR_DOMAIN_COM/wp-admin/`
2. Accept SSL warning (click "Proceed Anyway" or "Advanced")
3. Log in:
   - Username: `network-admin` (or what you set in .env)
   - Password: Check .env.production for initial password

---

## ⚙️ BACK ON GCP VM - WordPress Setup

### GCP COMMAND #9: Go to WordPress Settings

Once logged in to WordPress:

1. Go to: **Settings > Network Settings**
2. Verify:
   - ✓ "Network Title" = "Digital Scout"
   - ✓ "Network Admin Email" = your email
   - ✓ Selected = "Sub-directories" (NOT Sub-domains)

---

### GCP COMMAND #10: Activate Plugin

In WordPress, go to:

1. **My Sites > Network Admin > Plugins**
2. Find: "Digital Scout Multisite MVP Provisioner"
3. Click: **Network Activate**

---

### GCP COMMAND #11: Create Application Password

In WordPress:

1. Go to: **Users > Your Profile**
2. Scroll to: **Application Passwords**
3. Name: `Digital Scout API`
4. Click: **Add New Application Password**
5. **COPY the password** (looks like: `xxxx xxxx xxxx xxxx`)

---

### GCP COMMAND #12: Update .env.production

Back on your GCP VM terminal:

```bash
cd /opt/digitalscout
nano .env.production
```

Find this line:

```
WORDPRESS_MULTISITE_NETWORK_APP_PASSWORD=
```

Paste the password you just copied.

**Save:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

### GCP COMMAND #13: Restart App

```bash
cd /opt/digitalscout
docker-compose restart app
sleep 5
docker-compose ps
```

---

## ✅ VALIDATION

### GCP COMMAND #14: Run Validation

```bash
cd /opt/digitalscout
bash docker/validate-deployment.sh
```

Should show:

```
✓ All critical checks passed!
```

---

## 🧪 TEST END-TO-END

1. Open: `https://YOUR_DOMAIN_COM/`
2. Search for a business on the map
3. Select one
4. Click "Generate"
5. Wait for preview
6. Click "Sync to WordPress"
7. Go to WordPress > Sites
8. New site should appear
9. Click on it - should see content

---

## 🔐 FINAL HARDENING

### GCP COMMAND #15: Backup Setup

```bash
cd /opt/digitalscout
chmod +x backup-db.sh
./backup-db.sh
```

Schedule backups:

```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/digitalscout/backup-db.sh") | crontab -
crontab -l | grep backup
```

---

### GCP COMMAND #16: Firewall

```bash
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

---

### GCP COMMAND #17: SSL Auto-Renewal

```bash
sudo certbot renew --dry-run
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
sudo systemctl status certbot.timer
```

---

## ✨ DEPLOYMENT COMPLETE

Your system is now live at: `https://YOUR_DOMAIN_COM/`

---

## 📊 ONGOING COMMANDS

**Check status:**

```bash
cd /opt/digitalscout
docker-compose ps
```

**View logs:**

```bash
docker-compose logs -f
# Ctrl+C to exit
```

**Restart services:**

```bash
docker-compose restart app
```

**View specific service logs:**

```bash
docker-compose logs app
docker-compose logs wordpress
docker-compose logs mariadb
```

---

## 🆘 IF SOMETHING GOES WRONG

**Services won't start:**

```bash
cd /opt/digitalscout
docker-compose down
docker-compose logs
docker-compose up -d
```

**Can't access frontend:**

```bash
docker-compose logs nginx
docker-compose restart nginx
```

**API returns 404:**

```bash
docker-compose logs app
```

**WordPress login fails:**

```bash
docker-compose logs wordpress
docker-compose restart wordpress
```

---

## 📝 SUMMARY

**What you did locally:**

- ✓ Built frontend
- ✓ Generated passwords
- ✓ Created .env.production
- ✓ Uploaded to GCP

**What you do on GCP:**

1. SSH to VM
2. Create SSL directory
3. Generate SSL certificate
4. Update DNS (at registrar)
5. Build Docker image
6. Start services
7. Initialize WordPress
8. Set up application password
9. Run tests
10. Set up backups & firewall

**Total time:** 1-2 hours (mostly waiting for DNS)

---

**Ready? Follow the GCP COMMANDS in order.**
