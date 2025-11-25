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

# Create a symbolic link for nginx to find certificates at a consistent path
mkdir -p "certbot/conf/live/default"

# Check if certificates already exist
if [ -d "certbot/conf/live/$DOMAIN" ]; then
    echo "==> Certificates already exist for $DOMAIN"
    ln -sf "../$DOMAIN" "certbot/conf/live/default"
    echo "==> Certificate setup complete!"
    exit 0
fi

# Create dummy certificates for initial nginx startup
echo "==> Creating temporary self-signed certificate..."
docker compose run --rm --entrypoint "\
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/default/privkey.pem \
    -out /etc/letsencrypt/live/default/fullchain.pem \
    -subj '/CN=localhost'" certbot

# Start nginx with dummy certificate
echo "==> Starting nginx with temporary certificate..."
docker compose up -d frontend-vue

# Wait for nginx to be ready
echo "==> Waiting for nginx to start..."
sleep 5

# Delete dummy certificate
echo "==> Removing temporary certificate..."
docker compose run --rm --entrypoint "sh -c 'rm -rf /etc/letsencrypt/live/default/*'" certbot

# Request Let's Encrypt certificate
echo "==> Requesting Let's Encrypt certificate..."
docker compose run --rm --entrypoint "" certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Create symbolic link for nginx to find certificates
echo "==> Creating certificate symbolic link..."
cd certbot/conf/live
ln -sf "$DOMAIN" default
cd ../../../

# Copy SSL-enabled nginx config
echo "==> Switching to HTTPS-enabled nginx configuration..."
docker compose cp frontend/nginx-ssl.conf frontend-vue:/etc/nginx/nginx.conf

# Reload nginx
echo "==> Reloading nginx with new certificate..."
docker compose exec frontend-vue nginx -s reload

echo ""
echo "==> SSL certificate setup complete!"
echo "==> Your site should now be accessible at https://$DOMAIN"
echo ""
echo "Note: Certificates will auto-renew via the certbot container every 12 hours"
