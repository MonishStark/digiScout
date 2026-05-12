<!-- @format -->

# 🚀 DIGITAL SCOUT - DEPLOYMENT QUICK START

---

## YOUR VM

```
IP:   34.134.50.99
Name: instance-20260512-072402
Zone: us-central1-a
```

---

## 1️⃣ LOCAL MACHINE (Windows)

### Option A: PowerShell Script

```powershell
cd c:\Users\Dhanush\Downloads\zip
.\upload-to-gcp.ps1
```

### Option B: GCP Console Upload

1. Open https://console.cloud.google.com/
2. Compute Engine → VM Instances
3. Click SSH button
4. Follow "VM Commands" below

---

## 2️⃣ VM COMMANDS (SSH Session)

```bash
# Prepare directory
sudo mkdir -p /opt/digitalscout
sudo chown $USER:$USER /opt/digitalscout
cd /opt/digitalscout

# Upload files (if using GCP Console, skip and upload via browser)

# Start Docker services
docker-compose up -d

# Wait 60 seconds
sleep 60

# Check status
docker-compose ps
```

---

## 3️⃣ VERIFY

```bash
# Check if services are running
docker-compose ps

# Test health
curl http://localhost/health
```

---

## 4️⃣ ACCESS

```
Browser: http://34.134.50.99
WordPress Admin: http://34.134.50.99/wp-admin
```

---

## ⚡ EMERGENCY COMMANDS

```bash
# See all logs
docker-compose logs

# Restart everything
docker-compose restart

# Stop everything
docker-compose down

# See app-only logs
docker-compose logs app

# SSH into app container
docker-compose exec app bash
```

---

## 📁 FILES YOU HAVE

- `upload-to-gcp.ps1` → Upload script (PowerShell)
- `upload-to-gcp.bat` → Upload script (Batch)
- `DEPLOY_CHECKLIST.md` → Full steps
- `DEPLOY_NOW.md` → Detailed guide
- `.env.production` → Already has API keys ✅
- `docker-compose.yml` → Service config

---

## ✅ YOUR API KEYS ARE SET

✅ GEMINI_API_KEY
✅ GOOGLE_MAPS_PLATFORM_KEY
✅ VITE_NETLIFY_TOKEN
✅ CALLHIPPO_API_KEY
✅ Database passwords

**Everything is ready. Just upload & run!**

---

## 🎯 EXPECTED RESULT

After `docker-compose up -d`:

```
CONTAINER ID   IMAGE                   NAMES                STATUS
abc123         node:20-alpine          digitalscout-app     Up 10s
def456         nginx:alpine            digitalscout-nginx   Up 11s
ghi789         php8.2-fpm              digitalscout-wordpress   Up 12s
jkl012         mariadb:11              digitalscout-mariadb    Up 15s
```

**All should show "Up"**

---

**🚀 START UPLOADING NOW!**
