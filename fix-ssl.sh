#!/bin/bash

echo "Stopping certbot processes..."
sudo pkill -9 -f certbot || true
sudo rm -f /var/lib/letsencrypt/.certbot.lock || true
sudo rm -rf /tmp/certbot-* || true

echo "Preparing webroot and deploy hook..."
sudo mkdir -p /var/www/html/.well-known/acme-challenge /etc/letsencrypt/renewal-hooks/deploy
printf '%s\n' '#!/bin/sh' 'systemctl reload nginx' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

echo "Getting new certificate..."
sudo certbot certonly --webroot -w /var/www/html -d makishvili.duckdns.org --cert-name makishvili.duckdns.org --force-renewal --non-interactive --agree-tos --email admin@makishvili.duckdns.org

if [ $? -eq 0 ]; then
    echo "Certificate renewed successfully!"
    echo "Reloading nginx..."
    sudo systemctl reload nginx
    echo "Checking nginx status..."
    sudo systemctl status nginx --no-pager
else
    echo "Certificate renewal failed!"
    exit 1
fi
