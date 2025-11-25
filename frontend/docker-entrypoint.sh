#!/bin/sh
set -e

# Check if SSL certificates exist
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "SSL certificates found, using HTTPS configuration"
    
    # Replace domain placeholder in SSL config
    sed "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" /etc/nginx/nginx-ssl.conf.template > /etc/nginx/nginx.conf
else
    echo "No SSL certificates found, using HTTP-only configuration"
    
    # Use HTTP-only config
    cp /etc/nginx/nginx-http.conf.template /etc/nginx/nginx.conf
fi

# Test nginx configuration
nginx -t

# Start nginx
exec nginx -g 'daemon off;'
