<!-- @format -->

# Digital Scout - Production Architecture & Deployment

## Executive Summary

The Digital Scout application is deployed as a containerized multi-service stack on a GCP Compute Engine VM using Docker Compose. This document describes the production architecture, deployment strategy, and operational considerations.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET / USERS                         │
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTPS (Port 443)
                 │ HTTP (Port 80 → 443 redirect)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    GCP COMPUTE ENGINE VM                         │
│                  (Ubuntu 22.04 LTS, e2-micro)                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Docker Compose Network                   │  │
│  │              (Bridge: digitalscout-network)              │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────┐     │  │
│  │  │   NGINX Reverse Proxy Container                │     │  │
│  │  │   - Port 80 (HTTP redirect)                    │     │  │
│  │  │   - Port 443 (HTTPS with Let's Encrypt)       │     │  │
│  │  │   - Routes traffic based on URL paths         │     │  │
│  │  │   - Handles SSL/TLS termination               │     │  │
│  │  │   - Gzip compression, security headers        │     │  │
│  │  └─────────────────────────────────────────────────┘     │  │
│  │     ↓                    ↓                    ↓            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │ /api/*       │  │ /wp-*        │  │ /            │    │  │
│  │  │              │  │              │  │              │    │  │
│  │  ↓              ↓  ↓              ↓  ↓              ↓    │  │
│  │  ┌─────────────────────────┐  ┌──────────────────┐        │  │
│  │  │   Express App (5001)    │  │  WordPress (FPM) │        │  │
│  │  │ Node.js Backend         │  │  Multisite       │        │  │
│  │  │ - AI Generation         │  │  - Admin Panel   │        │  │
│  │  │ - Lead Qualification    │  │  - Subsites      │        │  │
│  │  │ - WordPress Provisioning│  │  - REST API      │        │  │
│  │  │ - Outreach Management   │  └──────────────────┘        │  │
│  │  │ - Static Frontend       │         ↓                    │  │
│  │  └─────────────────────────┘  ┌──────────────────────┐    │  │
│  │     ↓                           │  React Frontend      │    │  │
│  │     └───────────────────────────┤  (Static Files)      │    │  │
│  │                                 │  - HTML/CSS/JS       │    │  │
│  │                                 │  - Maps & Discovery  │    │  │
│  │                                 └──────────────────────┘    │  │
│  │                                                            │  │
│  │     ↓                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐     │  │
│  │  │            MariaDB Database (3306)              │     │  │
│  │  │ - WordPress posts & pages                      │     │  │
│  │  │ - Multisite configuration                      │     │  │
│  │  │ - User data & credentials                      │     │  │
│  │  │ - Generated site metadata                      │     │  │
│  │  └─────────────────────────────────────────────────┘     │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐    │  │
│  │  │          Persistent Volumes                      │    │  │
│  │  │ - mariadb_data        → /var/lib/mysql         │    │  │
│  │  │ - wordpress_data      → /var/www/html          │    │  │
│  │  │ - nginx_logs          → /var/log/nginx         │    │  │
│  │  │ - app_logs            → /var/log/app           │    │  │
│  │  └──────────────────────────────────────────────────┘    │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  External Service Connectivity:                              │
│  - Google Gemini API (AI Generation)                        │
│  - Google Maps API (Lead Discovery)                         │
│  - Netlify API (Static Site Deployment)                     │
│  - CallHippo API (SMS/WhatsApp Outreach)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Network Architecture

### Container Networking

All containers communicate via a Docker bridge network: `digitalscout-network`

```
Nginx (exposed ports 80, 443)
  ↓
Internal communication within network
  ├→ app:5001 (Express API)
  ├→ wordpress:9000 (PHP-FPM)
  └→ mariadb:3306 (Database)

External services (external network)
  ├→ Google Gemini API
  ├→ Google Maps API
  ├→ Netlify API
  └→ CallHippo API
```

### Port Mapping

| Container | Internal Port | Host Port | Exposed | Purpose                     |
| --------- | ------------- | --------- | ------- | --------------------------- |
| nginx     | 80            | 80        | Yes     | HTTP                        |
| nginx     | 443           | 443       | Yes     | HTTPS                       |
| app       | 5001          | N/A       | No      | Backend API (internal only) |
| wordpress | 9000          | N/A       | No      | PHP-FPM (internal only)     |
| mariadb   | 3306          | N/A       | No      | Database (internal only)    |

---

## Request Flow Diagrams

### Frontend Request (React SPA)

```
User Browser (https://your-domain.com/)
    ↓
Nginx (HTTPS, port 443)
    ↓
/var/www/html/frontend/index.html (React app)
    ↓
Browser loads React app
    ↓
User interacts with map, searches for businesses
```

### API Request (Business Search/AI Generation)

```
React Frontend
    ↓
POST /api/generate
    ↓
Nginx (reverse proxy)
    ↓
Express Backend (localhost:5001)
    ↓
Gemini API (external) + Google Maps API (external)
    ↓
Response with generated website schema
    ↓
React Frontend (display preview)
```

### WordPress Provisioning Request

```
Express Backend
    ↓
POST /api/wordpress/provision-site
    ↓
Express constructs WordPress REST API request
    ↓
WordPress Multisite REST API (/wp-json/digital-scout/v1/provision-site)
    ↓
Provisioning Plugin processes request
    ↓
Create new multisite subsite
Create admin user
Activate theme
Import media
Create pages
    ↓
WordPress database updated
    ↓
Response with new site URL
```

### Generated Site Public Access

```
User accesses: https://your-domain.com/client-site-name/
    ↓
Nginx routes to WordPress
    ↓
WordPress loads subsite
    ↓
User sees provisioned website (homepage, pages, media)
    ↓
User can login to wp-admin and edit content
```

---

## Service Dependencies

```
Startup Order (docker-compose handles this):

1. MariaDB (database must be ready first)
   ↓ (waits for DB to be ready)

2. WordPress (depends on MariaDB)
   ↓ (waits for DB connection)

3. Express App (depends on WordPress, MariaDB)
   ↓ (waits for WP REST API to be available)

4. Nginx (depends on App, WordPress)
   ↓ (waits for backend services)

5. All services healthy and ready for traffic
```

---

## Data Flow Architecture

### Application Data

```
React Frontend (browser)
    ↓ (JSON API calls)
Express Backend
    ↓ (queries, updates)
MariaDB Database
    ↓ (stores)
Business leads, website schemas, site metadata
```

### WordPress Multisite Data

```
Generated Website Schema (from Gemini)
    ↓
Gutenberg Blocks (from wordpress.ts)
    ↓
WordPress REST API
    ↓
MariaDB (wp_posts, wp_postmeta, etc.)
    ↓
Public Multisite Subsite

User edits in WordPress Admin
    ↓
wp-admin interface
    ↓
MariaDB updated
    ↓
Subsite reflects changes
```

### Media/Uploads

```
External Image URLs (from Gemini/Google)
    ↓
WordPress media import
    ↓
Persistent volume: wordpress_data:/var/www/html/wp-content/uploads/
    ↓
Media accessible via WordPress
    ↓
Served through Nginx /wp-content/ path
```

---

## Internal Communication Details

### Express to WordPress Communication

Express communicates with WordPress via HTTP to the `wordpress` container:

```typescript
// From src/lib/wordpress-provisioning.ts
const endpoint = `${config.baseUrl}/wp-json/digital-scout/v1/provision-site`;
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${authToken}`,  // Basic auth with app password
  },
  body: JSON.stringify({...})
});
```

**In Production:**

- `config.baseUrl` = `http://wordpress:80` (internal Docker network)
- Authentication uses WordPress application passwords (from env vars)
- Communication is internal to Docker network (not exposed publicly)

### Nginx to Express Communication

```
Nginx config: docker/nginx/nginx.conf
    ↓
upstream digitalscout_api {
  server app:5001;  ← Container name and internal port
}
    ↓
location /api/ {
  proxy_pass http://digitalscout_api;
}
```

### Nginx to WordPress Communication

```
location ~ ^/(wp-admin|wp-json)/ {
  proxy_pass http://digitalscout_wordpress;  ← PHP-FPM socket
}
```

---

## Environment Variable Injection

```
.env.production (host machine)
    ↓
docker-compose --env-file .env.production up -d
    ↓
Environment variables passed to containers at runtime
    ↓
app container receives:
  - GEMINI_API_KEY
  - GOOGLE_MAPS_PLATFORM_KEY
  - WORDPRESS_MULTISITE_BASE_URL
  - WORDPRESS_MULTISITE_NETWORK_USERNAME
  - WORDPRESS_MULTISITE_NETWORK_APP_PASSWORD
  - etc.
    ↓
server.ts reads from process.env
    ↓
Runtime behavior determined by values
```

---

## Volume & Persistence Architecture

### Volumes

| Volume Name    | Mount Path in Container | Purpose                  | Persistence |
| -------------- | ----------------------- | ------------------------ | ----------- |
| mariadb_data   | /var/lib/mysql          | Database files           | Persistent  |
| wordpress_data | /var/www/html           | WordPress files, uploads | Persistent  |
| nginx_logs     | /var/log/nginx          | Access & error logs      | Persistent  |
| app_logs       | /var/log/app            | Application logs         | Persistent  |

### File Mounts (Read-Only)

```
Host                          Container
docker/nginx/nginx.conf   →   /etc/nginx/nginx.conf
docker/nginx/ssl/         →   /etc/nginx/ssl/
docker/wordpress/         →   /var/www/html/wp-content/ (merged)
dist/                     →   /var/www/html/frontend/ (frontend)
```

---

## Health Check Architecture

Each service has health checks:

```
Nginx:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
  interval: 10s
  Result: Check /health endpoint

Express App:
  test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
  interval: 10s
  Result: Check /health endpoint returns 200

WordPress:
  test: ["CMD", "curl", "-f", "http://localhost:9000/ping"]
  interval: 10s
  Result: PHP-FPM ping check

MariaDB:
  test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
  interval: 10s
  Result: Database connection check
```

---

## Backup Architecture

### Database Backups

```
CronJob: Daily at 2 AM
    ↓
backup-db.sh script
    ↓
docker-compose exec mariadb mysqldump (all databases)
    ↓
/opt/digitalscout/backups/db_backup_YYYYMMDD_HHMMSS.sql
    ↓
Keep for 7 days, then delete
```

### File System Backups

```
WordPress content directory (persistent volume)
    ↓
Can be backed up via:
  - docker volume inspect (get mount point)
  - tar/rsync to external storage
  - GCP Snapshots (recommended for VM)
```

---

## Security Architecture

### Network Security

```
Internet
    ↓
GCP Firewall Rules (allow 22, 80, 443)
    ↓
Nginx (SSL/TLS termination)
    ↓
Docker Bridge Network (internal, isolated)
    ↓
Container-to-container communication (no external access)
```

### Service Isolation

```
Public:
  - Nginx (reverse proxy only)

Internal (Docker network only):
  - Express API
  - WordPress
  - MariaDB

External (outbound only):
  - API calls to Gemini, Maps, Netlify, CallHippo
```

### Secret Management

```
Secrets stored in: .env.production (not in git)
    ↓
docker-compose passes to containers
    ↓
Never logged or exposed
    ↓
Different per environment (local .env.local vs production .env.production)
```

---

## Scaling Considerations

### Current Configuration (e2-micro)

- Suitable for: MVP, demos, low traffic
- Limitations:
  - 1 vCPU (2 cores, burstable)
  - 1 GB RAM (tight with 4 services)
  - Low network bandwidth
  - Not suitable for production traffic

### Future Scaling Options

```
Option 1: Upgrade VM size
  e2-micro → e2-small (2 vCPU, 2GB RAM)
  e2-small → e2-medium (2 vCPU, 4GB RAM)

Option 2: Separate services
  MariaDB → Cloud SQL (managed service)
  WordPress uploads → Cloud Storage
  Frontend → Cloud CDN

Option 3: Kubernetes (later, if needed)
  Multiple Nginx replicas
  Multiple Express app replicas
  Managed MariaDB
```

---

## Disaster Recovery

### Recovery Procedures

1. **Database Corruption**

   ```bash
   # Restore from backup
   docker-compose exec -T mariadb mysql < backup.sql
   docker-compose restart wordpress app
   ```

2. **Container Failure**

   ```bash
   # Docker automatically restarts failed containers
   docker-compose ps  # Check status
   docker-compose restart service_name
   ```

3. **Volume Failure**

   ```bash
   # Stop services
   docker-compose down
   # Restore from GCP snapshot or backup
   # Restart services
   docker-compose up -d
   ```

4. **Complete System Failure**
   ```bash
   # Recreate from backup
   # Reinstall Docker
   # Deploy from scratch
   ```

---

## Monitoring & Observability

### Logs Location

```
Inside Docker containers:
  - App: /var/log/app/ (mounted volume)
  - Nginx: /var/log/nginx/ (mounted volume)
  - MariaDB: /var/log/mysql/ (inside container)
  - WordPress: /var/www/html/wp-content/debug.log

View logs:
  docker-compose logs app
  docker-compose logs nginx
  docker-compose logs -f wordpress
```

### Metrics to Monitor

```
1. CPU Usage
   - docker stats
   - GCP Monitoring

2. Memory Usage
   - free -h
   - docker stats

3. Disk Space
   - df -h
   - du -sh /opt/digitalscout/

4. Request Latency
   - Nginx access logs
   - Express logs

5. Database Performance
   - Slow query log
   - Connection count
   - Table size
```

---

## Deployment Checklist Summary

- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] DNS records updated
- [ ] Docker services starting
- [ ] Health checks passing
- [ ] Frontend loading
- [ ] API endpoints responding
- [ ] WordPress accessible
- [ ] Database backups scheduled
- [ ] Firewall rules configured
- [ ] Monitoring set up
- [ ] Team trained on operations

---

**Architecture Version**: 1.0  
**Last Updated**: May 2026  
**Deployment Target**: GCP Compute Engine (Ubuntu 22.04 LTS, e2-micro)
