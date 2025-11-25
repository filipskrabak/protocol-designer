#!/bin/bash

# SSL Certificate Setup Script for Protocol Designer
# This script initializes SSL certificates using Let's Encrypt via Docker

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Validate required variables
if [ -z "$DOMAIN" ]; then
    echo "Error: DOMAIN not set in .env file"
    echo "Please add: DOMAIN=yourdomain.com"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    echo "Error: EMAIL not set in .env file"
    echo "Please add: EMAIL=your-email@example.com"
    exit 1
fi

echo "==> Setting up SSL certificates for: $DOMAIN"
echo "==> Email: $EMAIL"
echo ""

# Create directory structure
mkdir -p certbot/conf
mkdir -p certbot/www

# Download recommended TLS parameters
if [ ! -f "certbot/conf/options-ssl-nginx.conf" ]; then
    echo "==> Downloading recommended TLS configuration..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
fi

if [ ! -f "certbot/conf/ssl-dhparams.pem" ]; then
    echo "==> Downloading DH parameters..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
fi

# Check if certificates already exist
if [ -d "certbot/conf/live/$DOMAIN" ]; then
    echo "==> Certificates already exist for $DOMAIN"
    echo "==> Restarting services to apply HTTPS configuration..."
    docker compose restart frontend-vue
    echo "==> Certificate setup complete!"
    exit 0
fi

# Ensure services are running
echo "==> Starting services..."
docker compose up -d

# Wait for nginx to be ready
echo "==> Waiting for nginx to start..."
sleep 5

# Request Let's Encrypt certificate
echo "==> Requesting Let's Encrypt certificate..."
docker compose run --rm --entrypoint "" certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Restart nginx to switch to HTTPS configuration
echo "==> Restarting nginx with HTTPS configuration..."
docker compose restart frontend-vue

echo ""
echo "==> SSL certificate setup complete!"
echo "==> Your site should now be accessible at https://$DOMAIN"
echo ""
echo "Note: Certificates will auto-renew via the certbot container every 12 hours"
