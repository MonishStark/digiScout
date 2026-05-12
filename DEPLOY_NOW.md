<!-- @format -->

# 🚀 DEPLOY TO GCP NOW - FOLLOW THIS

---

## YOUR VM DETAILS (From GCP Screenshot)

```
VM Name:      instance-20260512-072402
VM Zone:      us-central1-a
External IP:  34.134.50.99
```

---

## STEP 1: SSH INTO YOUR VM

**Copy and paste this command in PowerShell:**

```powershell
gcloud compute ssh instance-20260512-072402 --zone=us-central1-a
```

**If gcloud is not installed:**

- Alternative: Open GCP Console → Compute Engine → VM Instances → Click SSH button
- Or use PuTTY/MobaXterm to SSH to: `34.134.50.99`

---

## STEP 2: ON YOUR VM - PREPARE DIRECTORIES

**Once logged in via SSH, run these commands:**

```bash
# Create app directory
sudo mkdir -p /opt/digitalscout
sudo chown $USER:$USER /opt/digitalscout
cd /opt/digitalscout
```

---

## STEP 3: BACK ON YOUR LOCAL MACHINE - UPLOAD FILES

**Open a NEW PowerShell window (don't close SSH):**

**Create a simple upload script:**

```powershell
# On your local machine:
$sourceDir = "c:\Users\Dhanush\Downloads\zip"
$vmIP = "34.134.50.99"
$vmUser = "your_gcp_username"  # Default is usually your email or "ubuntu"

# Method 1: Using gcloud (if you have it)
gcloud compute scp --recurse $sourceDir instance-20260512-072402:/opt/digitalscout/ --zone=us-central1-a

# Method 2: Using SSH command (if gcloud not available)
# Upload via SSH tunneling (requires SSH key)
```

**OR simply copy the files manually:**

1. Open File Explorer
2. Right-click on `c:\Users\Dhanush\Downloads\zip` → Compress to ZIP
3. Upload via GCP Console SSH file uploader

---

## STEP 4: ON YOUR VM - VERIFY UPLOAD & START DEPLOYMENT

**Back in your SSH session, run:**

```bash
cd /opt/digitalscout

# Verify files uploaded
ls -la

# Install Docker (if not already installed)
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Build and start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

---

## EXPECTED OUTPUTS

### ✅ After SSH login:

```
Welcome to Ubuntu 22.04 LTS
Last login: [timestamp]
```

### ✅ After mkdir:

```
(no output = success)
```

### ✅ After ls -la:

```
total XX
drwxr-xr-x  X user group  XXXXX date .
drwxr-xr-x  X root root   XXXXX date ..
-rw-r--r--  X user group  XXXXX date .env.production
-rw-r--r--  X user group  XXXXX date docker-compose.yml
drwxr-xr-x  X user group  XXXXX date docker/
drwxr-xr-x  X user group  XXXXX date src/
drwxr-xr-x  X user group  XXXXX date dist/
```

### ✅ After docker-compose ps:

```
NAME                COMMAND                  SERVICE             STATUS
digitalscout-app    "node --loader tsx ..."  app                 Up 2 seconds
digitalscout-nginx  "nginx -g daemon of..." nginx               Up 3 seconds
digitalscout-mariadb "docker-entrypoint.s..." mariadb            Up 5 seconds
digitalscout-wordpress "docker-entrypoint.s..." wordpress         Up 4 seconds
```

---

## 🔧 TROUBLESHOOTING

### If SSH connection fails:

```bash
# Use GCP Console → VM Instance → SSH button
# Or check firewall rules in GCP
```

### If Docker not found:

```bash
# Install it:
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
```

### If docker-compose fails:

```bash
# Check .env.production exists:
cat .env.production | head -20

# Check permissions:
ls -la docker-compose.yml

# Run with sudo:
sudo docker-compose up -d
```

### If containers crash:

```bash
# Check logs:
docker-compose logs app
docker-compose logs wordpress
docker-compose logs mariadb

# Restart:
docker-compose restart
```

---

## ⏱️ WAIT FOR SERVICES TO START

After `docker-compose up -d`, wait 30-60 seconds for:

- MariaDB to initialize
- WordPress to start
- App server to connect to WordPress

Check with:

```bash
docker-compose logs app | tail -20
```

---

## ✅ VERIFY DEPLOYMENT

### From your local browser:

```
http://34.134.50.99/health
```

Should return:

```json
{ "status": "ok" }
```

---

## 🌐 SET UP DOMAIN (Optional)

Update your domain DNS settings:

```
A Record: your-domain.com → 34.134.50.99
```

Wait 5-10 minutes for propagation, then:

```
https://your-domain.com
```

---

## 📝 NEXT STEPS

1. ✅ SSH to VM
2. ✅ Create /opt/digitalscout directory
3. ✅ Upload files (any method above)
4. ✅ Run docker-compose up -d
5. ✅ Wait 60 seconds
6. ✅ Test health endpoint
7. ✅ Access WordPress admin at `/wp-admin`

---

## 🔑 WORDPRESS SETUP

Once running, access:

```
http://34.134.50.99/wp-admin
Username: admin (or what you set)
Password: Check .env.production or VM logs
```

---

**That's it! Your app is live on GCP! 🚀**
