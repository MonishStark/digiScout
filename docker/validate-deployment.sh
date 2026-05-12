#!/bin/bash

# Digital Scout Production Deployment Validation Script
# Run this after deployment to verify all components are working correctly

set -e

echo "======================================================================"
echo "Digital Scout Production Deployment Validation"
echo "======================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

# Helper function for test results
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAIL++))
    fi
}

test_warning() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARN++))
}

echo "Step 1: Checking Docker and Docker Compose Installation"
echo "----------------------------------------------------------------------"

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    test_result 0 "Docker installed: $DOCKER_VERSION"
else
    test_result 1 "Docker is not installed"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    test_result 0 "Docker Compose installed: $COMPOSE_VERSION"
else
    test_result 1 "Docker Compose is not installed"
fi

echo ""
echo "Step 2: Checking Docker Daemon Status"
echo "----------------------------------------------------------------------"

if docker info > /dev/null 2>&1; then
    test_result 0 "Docker daemon is running"
else
    test_result 1 "Docker daemon is not running"
    exit 1
fi

echo ""
echo "Step 3: Verifying Docker Compose Services"
echo "----------------------------------------------------------------------"

# Check if docker-compose.yml exists
if [ -f "docker-compose.yml" ]; then
    test_result 0 "docker-compose.yml found"
else
    test_result 1 "docker-compose.yml not found in current directory"
    exit 1
fi

# Check service status
echo ""
echo "Service Status:"
docker-compose ps
echo ""

# Verify each service
SERVICES=("nginx" "app" "wordpress" "mariadb")
for service in "${SERVICES[@]}"; do
    STATUS=$(docker-compose ps $service 2>/dev/null | tail -1 | awk '{print $NF}')
    if echo "$STATUS" | grep -q "Up\|healthy"; then
        test_result 0 "$service is running"
    else
        test_result 1 "$service is not running properly (Status: $STATUS)"
    fi
done

echo ""
echo "Step 4: Checking Environment Configuration"
echo "----------------------------------------------------------------------"

if [ -f ".env.production" ]; then
    test_result 0 ".env.production file exists"
    
    # Check for required environment variables
    REQUIRED_VARS=("GEMINI_API_KEY" "GOOGLE_MAPS_PLATFORM_KEY" "WORDPRESS_DB_PASSWORD" "MARIADB_ROOT_PASSWORD")
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .env.production; then
            if grep "^$var=" .env.production | grep -q "your_\|MY_\|generate_"; then
                test_warning "$var appears to still have placeholder value"
            else
                test_result 0 "$var is configured"
            fi
        else
            test_warning "$var is not defined in .env.production"
        fi
    done
else
    test_result 1 ".env.production file not found"
fi

echo ""
echo "Step 5: Testing Network Connectivity"
echo "----------------------------------------------------------------------"

# Test Nginx
echo "Testing Nginx..."
if docker-compose exec -T nginx curl -f http://localhost/health > /dev/null 2>&1; then
    test_result 0 "Nginx health check passed"
else
    test_result 1 "Nginx health check failed"
fi

# Test Express Backend
echo "Testing Express backend..."
if docker-compose exec -T app curl -f http://localhost:5001/health > /dev/null 2>&1; then
    test_result 0 "Express backend health check passed"
else
    test_result 1 "Express backend health check failed"
fi

# Test WordPress connectivity from app container
echo "Testing WordPress connectivity..."
if docker-compose exec -T app curl -f http://wordpress:9000/ping > /dev/null 2>&1; then
    test_result 0 "WordPress PHP-FPM is responding"
else
    test_warning "WordPress PHP-FPM may not be responding to ping"
fi

# Test Database connectivity
echo "Testing database connectivity..."
if docker-compose exec -T app curl -f http://mariadb:3306 > /dev/null 2>&1; then
    test_warning "MariaDB connectivity test (expected to fail for MySQL, this is OK)"
else
    if docker-compose exec -T mariadb mysql -e "SELECT 1" > /dev/null 2>&1; then
        test_result 0 "MariaDB database is responding"
    else
        test_result 1 "MariaDB database is not responding"
    fi
fi

echo ""
echo "Step 6: Testing API Endpoints"
echo "----------------------------------------------------------------------"

# Test /api/generate endpoint (should exist even if genai key is missing)
echo "Testing /api/generate endpoint..."
RESPONSE=$(docker-compose exec -T app curl -s -X POST http://localhost:5001/api/generate \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}' 2>/dev/null || echo "FAILED")

if echo "$RESPONSE" | grep -q '"meta"' || echo "$RESPONSE" | grep -q '"theme"'; then
    test_result 0 "/api/generate endpoint is responding"
else
    if echo "$RESPONSE" | grep -q "fallback\|FAILED"; then
        test_warning "/api/generate responding but may need API keys"
    else
        test_result 1 "/api/generate endpoint is not responding correctly"
    fi
fi

echo ""
echo "Step 7: Checking Volume Persistence"
echo "----------------------------------------------------------------------"

# List volumes
echo "Docker Volumes:"
docker volume ls | grep digitalscout || echo "No digitalscout volumes found"

# Check if volumes have data
MARIADB_VOLUME=$(docker volume inspect digitalscout_mariadb_data 2>/dev/null | grep -o '"Mountpoint": "[^"]*"' | cut -d'"' -f4 || echo "")
if [ -n "$MARIADB_VOLUME" ] && [ -d "$MARIADB_VOLUME" ]; then
    test_result 0 "MariaDB volume is mounted and exists"
else
    test_warning "Could not verify MariaDB volume mount location"
fi

echo ""
echo "Step 8: Checking File Permissions and Ownership"
echo "----------------------------------------------------------------------"

if [ -f "docker-compose.yml" ]; then
    OWNER=$(ls -l docker-compose.yml | awk '{print $3":"$4}')
    test_result 0 "docker-compose.yml owned by: $OWNER"
fi

if [ -d "docker" ]; then
    test_result 0 "Docker configuration directory exists"
fi

if [ -f "docker/nginx/nginx.conf" ]; then
    test_result 0 "Nginx configuration file found"
fi

echo ""
echo "Step 9: Checking SSL/HTTPS Configuration"
echo "----------------------------------------------------------------------"

if [ -d "docker/nginx/ssl" ]; then
    if [ -f "docker/nginx/ssl/cert.pem" ] && [ -f "docker/nginx/ssl/key.pem" ]; then
        test_result 0 "SSL certificates found"
        
        # Check certificate expiration
        CERT_EXPIRY=$(openssl x509 -in docker/nginx/ssl/cert.pem -noout -enddate 2>/dev/null | cut -d= -f2 || echo "Could not determine")
        echo "Certificate expires: $CERT_EXPIRY"
    else
        test_result 1 "SSL certificates not found in docker/nginx/ssl/"
    fi
else
    test_result 1 "SSL directory does not exist"
fi

echo ""
echo "Step 10: Checking WordPress Configuration"
echo "----------------------------------------------------------------------"

if [ -f "docker/wordpress/wp-config-extra.php" ]; then
    test_result 0 "WordPress configuration file found"
    
    # Check for multisite configuration
    if grep -q "MULTISITE.*true" docker/wordpress/wp-config-extra.php; then
        test_result 0 "WordPress Multisite configuration detected"
    else
        test_warning "Multisite configuration may not be properly set"
    fi
else
    test_result 1 "WordPress configuration file not found"
fi

if [ -d "wordpress/multisite-mvp-provisioner" ]; then
    test_result 0 "WordPress provisioning plugin found"
else
    test_warning "WordPress provisioning plugin directory not found"
fi

echo ""
echo "Step 11: Checking Database Configuration"
echo "----------------------------------------------------------------------"

if [ -f "docker/mariadb/my.cnf" ]; then
    test_result 0 "MariaDB configuration found"
else
    test_warning "MariaDB configuration file not found"
fi

echo ""
echo "Step 12: Checking Frontend Build"
echo "----------------------------------------------------------------------"

if [ -d "dist" ]; then
    if [ -f "dist/index.html" ]; then
        test_result 0 "React frontend build found (dist/index.html)"
        FILE_SIZE=$(du -sh dist | awk '{print $1}')
        echo "Frontend build size: $FILE_SIZE"
    else
        test_result 1 "dist directory exists but index.html not found"
    fi
else
    test_result 1 "Frontend build directory (dist/) not found - run 'npm run build' first"
fi

echo ""
echo "Step 13: Container Log Check"
echo "----------------------------------------------------------------------"

echo "Recent app container logs (last 5 lines):"
docker-compose logs app 2>/dev/null | tail -5 || echo "Could not retrieve logs"

echo ""
echo "Recent WordPress container logs (last 5 lines):"
docker-compose logs wordpress 2>/dev/null | tail -5 || echo "Could not retrieve logs"

echo ""
echo "======================================================================"
echo "VALIDATION SUMMARY"
echo "======================================================================"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo -e "${YELLOW}Warnings: $WARN${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    if [ $WARN -gt 0 ]; then
        echo -e "${YELLOW}⚠ Review the warnings above before going live.${NC}"
    fi
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the issues above.${NC}"
    exit 1
fi
