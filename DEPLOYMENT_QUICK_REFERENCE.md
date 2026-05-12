<!-- @format -->

# Digital Scout Production Deployment - Quick Reference

## One-Command Deployment (After Setup)

```bash
# SSH to GCP VM
gcloud compute ssh your-instance-name --zone=us-central1-a

# Navigate to app directory
cd /opt/digitalscout

# Deploy
docker-compose --env-file .env.production up -d

# Verify
docker-compose ps
```

---

## Key Ports & Services

| Service           | Internal Port | External | Purpose                        |
| ----------------- | ------------- | -------- | ------------------------------ |
| Nginx             | 80, 443       | Public   | Reverse proxy, SSL termination |
| Express API       | 5001          | Internal | REST API backend               |
| WordPress PHP-FPM | 9000          | Internal | WordPress CMS                  |
| MariaDB           | 3306          | Internal | Database                       |

---

## Service Communication

```
Public User
    ↓
Nginx (80/443) ← Terminates SSL, routes traffic
    ├→ /api/* → Express App (5001)
    ├→ /wp-admin, /wp-json, /wp-content → WordPress (9000)
    └→ / → React Frontend (static files)

Express App (5001)
    ↓
WordPress REST API (9000)
    ↓
MariaDB (3306)
```

---

## Common Commands

### View Logs

```bash
docker-compose logs -f                    # All services
docker-compose logs app                   # Backend only
docker-compose logs wordpress              # WordPress only
docker-compose logs mariadb                # Database only
```

### Restart Services

```bash
docker-compose restart                    # Restart all
docker-compose restart app                # Restart backend
docker-compose restart wordpress          # Restart WordPress
```

### Access WordPress Database

```bash
docker-compose exec mariadb mysql \
  -u wp_user -p${WORDPRESS_DB_PASSWORD} \
  digitalscout_wp
```

### Backup Database

```bash
docker-compose exec -T mariadb mysqldump \
  -u root -p${MARIADB_ROOT_PASSWORD} \
  --all-databases > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Update & Redeploy

```bash
docker-compose pull                       # Pull latest images
docker-compose build --no-cache app       # Rebuild custom image
docker-compose up -d                      # Apply changes
```

---

## URL Structure

| URL                                  | Routes To                     |
| ------------------------------------ | ----------------------------- |
| `https://your-domain.com/`           | React frontend                |
| `https://your-domain.com/api/*`      | Express backend               |
| `https://your-domain.com/wp-admin/`  | WordPress admin               |
| `https://your-domain.com/site-name/` | Provisioned WordPress subsite |
| `https://your-domain.com/wp-json/`   | WordPress REST API            |

---

## Environment Variables Reference

```bash
# External APIs (obtain from respective services)
GEMINI_API_KEY=
GOOGLE_MAPS_PLATFORM_KEY=
VITE_NETLIFY_TOKEN=
CALLHIPPO_API_KEY=

# WordPress
WORDPRESS_DB_NAME=digitalscout_wp
WORDPRESS_DB_USER=wp_user
WORDPRESS_DB_PASSWORD=<strong_password>
WORDPRESS_MULTISITE_NETWORK_USERNAME=network-admin
WORDPRESS_MULTISITE_NETWORK_APP_PASSWORD=<app_password>

# Database
MARIADB_ROOT_PASSWORD=<strong_password>

# Domain
APP_DOMAIN=your-domain.com
```

---

## Troubleshooting Quick Fixes

**Services won't start:**

```bash
docker-compose down
docker-compose --env-file .env.production up -d
```

**Can't reach backend API:**

```bash
docker-compose logs app          # Check for errors
docker-compose ps                 # Verify app is running
```

**WordPress login fails:**

```bash
# Verify database connectivity
docker-compose exec app curl http://wordpress:80/wp-json/

# Check WordPress configuration
docker-compose exec wordpress wp config list
```

**SSL certificate issues:**

```bash
# View certificate details
openssl x509 -in docker/nginx/ssl/cert.pem -text -noout

# Test connection
openssl s_client -connect your-domain.com:443
```

---

## Monitoring Health

```bash
# All services healthy?
docker-compose ps

# Check specific service
docker-compose exec app curl http://localhost:5001/health
docker-compose logs --tail=50 wordpress
```

---

## File Structure Reference

```
/opt/digitalscout/
├── docker-compose.yml           ← Main orchestration file
├── .env.production              ← Production secrets (DO NOT COMMIT)
├── docker/
│   ├── Dockerfile.app           ← Node/Express image
│   ├── nginx/
│   │   ├── nginx.conf           ← Reverse proxy config
│   │   └── ssl/                 ← SSL certificates
│   ├── wordpress/
│   │   └── wp-config-extra.php  ← Multisite config
│   └── mariadb/
│       └── my.cnf               ← Database config
├── dist/                        ← Built React frontend
└── backups/                     ← Database backups
```

---

## First Time After Deployment

1. Access `https://your-domain.com/wp-admin/`
2. Log in with WordPress credentials
3. Go to Plugins > Network Plugins
4. Activate "Digital Scout Multisite MVP Provisioner"
5. Test by generating a lead and provisioning a site

---

## Performance Tips

1. **Database Backups**: Scheduled daily at 2 AM
2. **Cache**: Let Nginx cache static assets (1 year TTL)
3. **Gzip**: Enabled for responses
4. **Memory**: WP_MEMORY_LIMIT = 256M, MAX = 512M
5. **Connections**: Max 100 for this VM size

---

## Security Checklist

- [x] SSL/HTTPS enabled
- [x] Firewall configured (allow 22, 80, 443 only)
- [x] Docker containers on internal network
- [x] Environment secrets in .env.production
- [x] WordPress file editing disabled
- [x] Database password strong
- [x] Regular backups scheduled
- [x] Admin passwords changed from defaults

---

## Emergency Procedures

**Complete backup:**

```bash
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz /opt/digitalscout/
```

**Full restore:**

```bash
docker-compose down
docker-compose --env-file .env.production up -d
```

**Rollback to previous image:**

```bash
docker-compose up --force-recreate
```

---

## Support Commands

```bash
# System resources
free -h                          # Memory
df -h                            # Disk
top                             # CPU usage

# Docker info
docker ps -a                     # All containers
docker images                    # All images
docker system df                 # Docker resource usage

# Network connectivity
docker-compose exec app ping wordpress
docker-compose exec wordpress ping mariadb
```

---

**Last Updated**: May 2026
**For detailed guide**: See DEPLOYMENT_GUIDE.md
