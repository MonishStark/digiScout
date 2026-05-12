<!-- @format -->

# Digital Scout - Production Deployment Package

## 🚀 What's Included

This package contains everything needed to deploy the Digital Scout application to production on a GCP Compute Engine VM.

### Documentation Files

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Comprehensive step-by-step deployment instructions (450+ lines)
- **[DEPLOYMENT_QUICK_REFERENCE.md](DEPLOYMENT_QUICK_REFERENCE.md)** - Quick lookup reference for common tasks
- **[PRODUCTION_ARCHITECTURE.md](PRODUCTION_ARCHITECTURE.md)** - Detailed architecture diagrams and data flow
- **[.env.production.example](.env.production.example)** - Environment variable template with 110+ documented variables
- **[docker/validate-deployment.sh](docker/validate-deployment.sh)** - Automated validation script

### Infrastructure Files

```
docker/
├── docker-compose.yml                    # Main orchestration file
├── Dockerfile.app                        # Node/Express production image
├── nginx/
│   ├── nginx.conf                        # Reverse proxy configuration
│   └── ssl/                              # SSL certificates directory
├── wordpress/
│   ├── wp-config-extra.php               # Multisite configuration
│   └── digital-scout-base-theme/         # Custom WordPress theme
├── mariadb/
│   └── my.cnf                            # Database performance tuning
└── validate-deployment.sh                # Validation script
```

### Application Files

```
src/                                      # Source code (Node.js backend + React frontend)
dist/                                     # Built React frontend (run: npm run build)
wordpress/                                # WordPress plugins
package.json                              # Dependencies
```

---

## 📋 Pre-Deployment Checklist

Before deploying to GCP, ensure you have:

- [ ] **GCP Account** - Active GCP project with billing enabled
- [ ] **Compute Engine VM** - Ubuntu 22.04 LTS, e2-micro size
- [ ] **Docker** - Installed on the VM
- [ ] **Domain Name** - Purchased and registrar access available
- [ ] **API Keys** - Obtained from:
  - [ ] Google Generative AI (Gemini)
  - [ ] Google Cloud Platform (Maps Platform)
  - [ ] Netlify (deployment token)
  - [ ] CallHippo (SMS/WhatsApp API key)
- [ ] **SSL Certificate** - Ready to generate (Let's Encrypt recommended)
- [ ] **SSH Access** - To your GCP VM
- [ ] **Local Build** - `npm run build` executed successfully

---

## 🔑 Required API Keys & Credentials

### 1. Google Generative AI (Gemini)

**Purpose**: AI website schema generation

1. Go to: https://aistudio.google.com/app/apikeys
2. Create a new API key
3. Copy the key to `GEMINI_API_KEY` in `.env.production`

### 2. Google Cloud Maps Platform

**Purpose**: Business discovery and lead enrichment

1. Go to: https://console.cloud.google.com/apis/library
2. Enable "Places API" and "Maps JavaScript API"
3. Create an API key in credentials
4. Copy to `GOOGLE_MAPS_PLATFORM_KEY` in `.env.production`

### 3. Netlify API Token

**Purpose**: Deploy generated static sites

1. Log in to Netlify: https://app.netlify.com/
2. Settings > Applications > Personal access tokens
3. Create new token
4. Copy to `VITE_NETLIFY_TOKEN` in `.env.production`

### 4. CallHippo API Key

**Purpose**: Send SMS/WhatsApp outreach messages

1. Log in to CallHippo: https://app.callhippo.com/
2. Integrations > API
3. Get your API key
4. Copy to `CALLHIPPO_API_KEY` in `.env.production`

---

## 🚀 Quick Start (After Prerequisites)

### Step 1: Prepare Environment

```bash
# On your local machine

# Copy environment template
cp .env.production.example .env.production

# Edit with your credentials
nano .env.production  # or use your editor

# Build frontend
npm run build
```

### Step 2: Upload to GCP VM

```bash
# Using gcloud CLI (recommended)
gcloud compute scp --recurse . your-instance-name:/opt/digitalscout/ \
  --zone=us-central1-a

# Or using rsync
rsync -av --exclude='node_modules' --exclude='.git' \
  ./ your-vm-ip:/opt/digitalscout/
```

### Step 3: Configure SSL & Deploy

```bash
# SSH into your GCP VM
gcloud compute ssh your-instance-name --zone=us-central1-a

# Navigate to app directory
cd /opt/digitalscout

# Generate SSL certificates (Let's Encrypt)
sudo certbot certonly --standalone \
  -d your-domain.com \
  --email admin@your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/nginx/ssl/key.pem
sudo chown 1000:1000 docker/nginx/ssl/*

# Deploy
docker-compose --env-file .env.production up -d

# Verify
docker-compose ps
bash docker/validate-deployment.sh
```

### Step 4: Update DNS Records

At your domain registrar (GoDaddy, Namecheap, etc.):

```
Type: A Record
Name: your-domain.com (or @)
Value: <your-gcp-vm-external-ip>

Type: A Record (optional)
Name: www
Value: <your-gcp-vm-external-ip>
```

Wait for DNS propagation (5-30 minutes).

### Step 5: Initialize WordPress

1. Open: `https://your-domain.com/wp-admin/`
2. Log in with WordPress credentials
3. Go to My Sites > Network Admin > Plugins
4. Activate "Digital Scout Multisite MVP Provisioner"
5. Create application password (Users > Your Profile > Application Passwords)
6. Update `.env.production` with the new password
7. Restart app: `docker-compose restart app`

---

## 📚 Documentation Guide

### For First-Time Deployment

**Start here**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

Complete step-by-step instructions covering:

- Environment setup
- File uploading
- SSL configuration
- DNS setup
- Docker Compose deployment
- WordPress initialization
- Verification procedures
- Troubleshooting

### For Quick References

**Use this**: [DEPLOYMENT_QUICK_REFERENCE.md](DEPLOYMENT_QUICK_REFERENCE.md)

Quick lookup for:

- Common commands
- Service status checks
- Log viewing
- Database operations
- Emergency procedures

### For Architecture Understanding

**Read this**: [PRODUCTION_ARCHITECTURE.md](PRODUCTION_ARCHITECTURE.md)

Detailed information about:

- System architecture diagrams
- Network design
- Data flow
- Service dependencies
- Security architecture
- Scaling considerations

### For Environment Configuration

**Reference**: [.env.production.example](.env.production.example)

Complete list of all environment variables with:

- Descriptions
- Required vs optional
- How to obtain values
- Security considerations

---

## 🔍 Validation

After deployment, run the validation script:

```bash
bash docker/validate-deployment.sh
```

This checks:

- Docker installation
- Service status
- Network connectivity
- API endpoints
- File permissions
- SSL configuration
- Database connectivity
- WordPress setup

---

## 📊 System Architecture

```
Internet Users
        ↓
  Nginx (HTTPS, 443)
        ↓
    ┌───┴───┬─────────┐
    ↓       ↓         ↓
  API  WordPress  Frontend
    ↓       ↓         ↓
  Express  PHP-FPM  React
    ↓       ↓       (static)
    └───┬───┘
        ↓
    MariaDB
```

**All services are containerized and orchestrated with Docker Compose on a single VM.**

---

## 🛠 Common Operations

### View Service Status

```bash
docker-compose ps
```

### View Logs

```bash
docker-compose logs app          # Backend
docker-compose logs wordpress    # WordPress
docker-compose logs nginx        # Reverse proxy
docker-compose logs -f mariadb   # Database (follow mode)
```

### Restart Services

```bash
docker-compose restart app       # Restart backend
docker-compose restart          # Restart all
```

### Backup Database

```bash
./backup-db.sh  # Or manually:
docker-compose exec -T mariadb mysqldump \
  -u root -p${MARIADB_ROOT_PASSWORD} \
  --all-databases > backup_$(date +%Y%m%d).sql
```

### Update & Redeploy

```bash
docker-compose pull              # Get latest images
docker-compose build app         # Rebuild custom image
docker-compose up -d             # Apply changes
```

---

## 🔐 Security Considerations

- ✅ **SSL/HTTPS**: Required for all external communication
- ✅ **Secrets**: Store in `.env.production` (never in code)
- ✅ **Network**: Internal Docker network isolates services
- ✅ **Firewall**: Only ports 22, 80, 443 exposed
- ✅ **Passwords**: Use strong, randomly generated passwords
- ✅ **Backups**: Automated daily at 2 AM

---

## 📈 Performance Notes

The e2-micro VM is suitable for:

- ✅ MVP and demos
- ✅ Low-traffic sites
- ✅ Development testing
- ✅ Proof of concepts

For production traffic:

- Consider upgrading to e2-small or e2-medium
- Move database to Cloud SQL
- Use Cloud Storage for uploads
- Add Cloud CDN for frontend

---

## 🆘 Troubleshooting Quick Links

| Issue                  | Solution                                                              |
| ---------------------- | --------------------------------------------------------------------- |
| Containers won't start | Run `docker-compose logs` to see errors                               |
| API returns 404        | Check backend container: `docker-compose ps app`                      |
| WordPress login fails  | Verify database: `docker-compose logs mariadb`                        |
| SSL certificate errors | Check certificate: `openssl x509 -in docker/nginx/ssl/cert.pem -text` |
| Can't reach domain     | Verify DNS propagation and VM firewall rules                          |

**For detailed troubleshooting**: See DEPLOYMENT_GUIDE.md (Troubleshooting section)

---

## 📞 Support Resources

- **Docker Documentation**: https://docs.docker.com/
- **WordPress Multisite**: https://wordpress.org/support/article/create-a-network/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **GCP Compute Engine**: https://cloud.google.com/compute/docs

---

## 📝 File Checklist

Ensure all files are in place:

```
✓ docker-compose.yml
✓ docker/Dockerfile.app
✓ docker/nginx/nginx.conf
✓ docker/wordpress/wp-config-extra.php
✓ docker/mariadb/my.cnf
✓ docker/validate-deployment.sh
✓ .env.production.example
✓ DEPLOYMENT_GUIDE.md
✓ DEPLOYMENT_QUICK_REFERENCE.md
✓ PRODUCTION_ARCHITECTURE.md
✓ dist/index.html (from npm run build)
✓ src/lib/ (backend code)
✓ wordpress/multisite-mvp-provisioner/ (plugin)
```

---

## 🎯 Next Steps

1. **Gather Credentials**
   - Obtain all required API keys
   - Generate secure passwords
   - Prepare domain name

2. **Prepare Application**
   - Create `.env.production` with your values
   - Run `npm run build` to create frontend build
   - Test locally with `npm run dev`

3. **Deploy to GCP**
   - Upload files to VM
   - Configure SSL certificates
   - Update DNS records
   - Run deployment validation

4. **Post-Deployment**
   - Access WordPress admin
   - Activate provisioning plugin
   - Test full workflow (search → generate → provision)
   - Set up monitoring and backups

5. **Go Live**
   - Announce production URL
   - Train team on operations
   - Monitor performance
   - Plan for scaling

---

## 📌 Important Notes

- **Keep `.env.production` secure** - Never commit to git, never share
- **Backup regularly** - Automated daily, verify restore capability
- **Monitor resources** - e2-micro has limited CPU/RAM, upgrade if needed
- **Test thoroughly** - Especially before handling real business data
- **Plan for growth** - Document scaling strategy early
- **Keep documentation updated** - Update this README as you make changes

---

## 📄 Version & Metadata

- **Application**: Digital Scout MVP
- **Deployment Method**: Docker Compose
- **Target Platform**: GCP Compute Engine (Ubuntu 22.04 LTS)
- **VM Size**: e2-micro (2 vCPU, 1 GB RAM)
- **Container Architecture**: 4 services (Nginx, Express, WordPress, MariaDB)
- **Documentation Version**: 1.0
- **Last Updated**: May 2026

---

## ✅ Deployment Status

- [x] Docker infrastructure created
- [x] Configuration templates prepared
- [x] Documentation completed
- [ ] **Ready for user to fill in credentials and deploy**

**To begin**: Follow the Quick Start section above, then refer to DEPLOYMENT_GUIDE.md for detailed instructions.

---

**Need help?** Refer to the full DEPLOYMENT_GUIDE.md or DEPLOYMENT_QUICK_REFERENCE.md for detailed information.

**Questions about architecture?** See PRODUCTION_ARCHITECTURE.md for diagrams and detailed explanations.

**Ready to deploy?** Start with Step 1 of the Quick Start section.
