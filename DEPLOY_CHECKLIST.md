<!-- @format -->

# ✅ READY TO DEPLOY - YOUR COMMAND LIST

---

## 📌 YOUR VM INFO

| Detail      | Value                    |
| ----------- | ------------------------ |
| **VM Name** | instance-20260512-072402 |
| **VM Zone** | us-central1-a            |
| **VM IP**   | 34.134.50.99             |
| **Status**  | ✅ Running               |

---

## ✅ WHAT'S BEEN DONE

- ✅ Frontend built (`dist/index.html`)
- ✅ API keys added to `.env.production`
  - GEMINI_API_KEY ✅
  - GOOGLE_MAPS_PLATFORM_KEY ✅
  - VITE_NETLIFY_TOKEN ✅
  - CALLHIPPO_API_KEY ✅
- ✅ Database passwords generated
- ✅ Docker configs ready
- ✅ All files in local folder

---

## 🎯 NEXT: UPLOAD & DEPLOY

### STEP 1: Run Upload Script (Choose One)

**PowerShell (Recommended):**

```powershell
# Navigate to your project folder
cd c:\Users\Dhanush\Downloads\zip

# Run the upload script
.\upload-to-gcp.ps1
```

**OR Batch/CMD:**

```cmd
cd c:\Users\Dhanush\Downloads\zip
upload-to-gcp.bat
```

**OR Manual GCP Console:**

1. Open: https://console.cloud.google.com/
2. Compute Engine → VM Instances
3. Click SSH for: `instance-20260512-072402`
4. Run commands from **STEP 2** below

---

### STEP 2: On Your GCP VM (via SSH)

**Connect to VM:**

```bash
gcloud compute ssh instance-20260512-072402 --zone=us-central1-a
```

**Or use GCP Console SSH button**

---

### STEP 3: On VM - Create Directory

```bash
sudo mkdir -p /opt/digitalscout
sudo chown $USER:$USER /opt/digitalscout
cd /opt/digitalscout
```

---

### STEP 4: On VM - Install Docker (if needed)

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

---

### STEP 5: On VM - Upload Files

**If using script (from local machine):**

```powershell
.\upload-to-gcp.ps1
```

**If manual (on VM via GCP Console):**

```bash
# Create directory and cd into it
sudo mkdir -p /opt/digitalscout
sudo chown ubuntu:ubuntu /opt/digitalscout
cd /opt/digitalscout

# Then upload via browser file uploader or paste files
```

---

### STEP 6: On VM - Verify Upload

```bash
cd /opt/digitalscout
ls -la

# Should show:
# - docker-compose.yml
# - .env.production
# - docker/
# - src/
# - dist/
```

---

### STEP 7: On VM - Start Services

```bash
docker-compose up -d
```

**Expected output:**

```
Creating digitalscout-mariadb   ... done
Creating digitalscout-wordpress ... done
Creating digitalscout-app       ... done
Creating digitalscout-nginx     ... done
```

---

### STEP 8: On VM - Wait & Check

```bash
# Wait 30-60 seconds
sleep 60

# Check status
docker-compose ps

# Should show all containers UP:
# NAME                STATUS
# digitalscout-mariadb    Up ...
# digitalscout-wordpress  Up ...
# digitalscout-app        Up ...
# digitalscout-nginx      Up ...
```

---

### STEP 9: On VM - Check Health

```bash
# Option 1: From VM
curl http://localhost/health

# Should return:
# {"status":"ok"}
```

**Or from local machine:**

```bash
curl http://34.134.50.99/health
```

---

### STEP 10: Access Your App

```
Frontend:  http://34.134.50.99
Health:    http://34.134.50.99/health
WordPress: http://34.134.50.99/wp-admin
```

---

## 🔑 WORDPRESS ADMIN ACCESS

**First login:**

- URL: `http://34.134.50.99/wp-admin`
- Username: `admin` (or check logs)
- Password: In logs or `.env.production`

**Find password:**

```bash
docker-compose logs app | grep -i wordpress
```

---

## 🌐 OPTIONAL: SET UP DOMAIN

Update your domain registrar DNS:

```
A Record: your-domain.com → 34.134.50.99
```

Wait 5-10 minutes, then:

```
https://your-domain.com
```

---

## 📝 TROUBLESHOOTING

### Container not starting?

```bash
docker-compose logs app
docker-compose logs wordpress
docker-compose logs mariadb
```

### Permission denied?

```bash
sudo chown -R $USER:$USER /opt/digitalscout
chmod -R 755 /opt/digitalscout
```

### Docker not installed?

```bash
sudo apt-get install -y docker.io docker-compose-plugin
```

### Want to stop?

```bash
docker-compose down
```

### Want to restart?

```bash
docker-compose restart
```

### Want to see logs?

```bash
docker-compose logs -f  # Follow app logs
```

---

## 📊 QUICK COMMAND REFERENCE

| Task                | Command                                                            |
| ------------------- | ------------------------------------------------------------------ |
| SSH to VM           | `gcloud compute ssh instance-20260512-072402 --zone=us-central1-a` |
| View logs           | `docker-compose logs -f app`                                       |
| Check status        | `docker-compose ps`                                                |
| Stop services       | `docker-compose down`                                              |
| Restart services    | `docker-compose restart`                                           |
| Restart app only    | `docker-compose restart app`                                       |
| View WordPress logs | `docker-compose logs wordpress`                                    |
| View database logs  | `docker-compose logs mariadb`                                      |

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Run upload script from local machine
- [ ] Verify files uploaded to VM
- [ ] Run `docker-compose up -d`
- [ ] Wait 60 seconds
- [ ] Check `docker-compose ps` - all UP
- [ ] Test health: `curl http://34.134.50.99/health`
- [ ] Access WordPress: `http://34.134.50.99/wp-admin`
- [ ] Update domain DNS (optional)
- [ ] Test features: search → generate → provision

---

## 🎉 YOU'RE LIVE!

Your Digital Scout app is running on:

```
http://34.134.50.99
```

---

## 🔒 SECURITY REMINDERS

- Keep `.env.production` private
- Don't share API keys
- Update domain DNS (instead of using IP)
- Set up HTTPS/SSL with Let's Encrypt
- Use firewall rules to restrict access

---

## 📞 SUPPORT

**Files to check:**

- `.env.production` - Environment variables
- `docker-compose.yml` - Service configuration
- `docker-compose logs` - Debug info
- `docker logs [container-name]` - Container-specific logs

---

**🚀 Ready to deploy? Run upload script now!**
