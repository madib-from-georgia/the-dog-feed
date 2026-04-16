#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")/..
DEPLOY_CONFIG_FILE="$PROJECT_ROOT/.deploy-config"
ENV_FILE="$PROJECT_ROOT/.env"

SSH_USER="${SSH_USER:-yc-user}"
VM_IP="${VM_IP:-89.169.189.202}"

if [ -f "$DEPLOY_CONFIG_FILE" ]; then
    # shellcheck disable=SC1090
    source "$DEPLOY_CONFIG_FILE"
fi

SERVER="${SSH_USER}@${VM_IP}"

BOT_TOKEN="${BOT_TOKEN_PROD:-}"
WEBHOOK_URL="${WEBHOOK_URL:-}"

if [ -f "$ENV_FILE" ]; then
    if [ -z "$BOT_TOKEN" ]; then
        BOT_TOKEN=$(grep '^BOT_TOKEN_PROD=' "$ENV_FILE" | cut -d= -f2- || true)
    fi

    if [ -z "$WEBHOOK_URL" ]; then
        WEBHOOK_URL=$(grep '^WEBHOOK_URL=' "$ENV_FILE" | cut -d= -f2- || true)
    fi
fi

if [ -z "$BOT_TOKEN" ]; then
    echo "BOT_TOKEN_PROD не найден в .env"
    exit 1
fi

DEFAULT_DOMAIN="$WEBHOOK_URL"
DEFAULT_DOMAIN=${DEFAULT_DOMAIN#http://}
DEFAULT_DOMAIN=${DEFAULT_DOMAIN#https://}
DEFAULT_DOMAIN=${DEFAULT_DOMAIN%%/*}

ALERT_CHAT_ID="${1:-${SSL_ALERT_CHAT_ID:-}}"
SSL_DOMAIN="${2:-${SSL_DOMAIN:-$DEFAULT_DOMAIN}}"
ALERT_DAYS="${3:-${SSL_ALERT_DAYS:-14}}"

if [ -z "$ALERT_CHAT_ID" ]; then
    echo "Использование: ./scripts/maintenance/setup-ssl-monitor-yandex.sh <alert-chat-id> [domain] [alert-days]"
    exit 1
fi

if [ -z "$SSL_DOMAIN" ]; then
    echo "Не удалось определить домен для SSL monitor"
    exit 1
fi

scp \
    "$SCRIPT_DIR/check-ssl-cert.sh" \
    "$SCRIPT_DIR/dog-feeding-ssl-monitor.service" \
    "$SCRIPT_DIR/dog-feeding-ssl-monitor.timer" \
    "$SCRIPT_DIR/reload-nginx-renewal-hook.sh" \
    "$SERVER:/tmp/"

ssh "$SERVER" "sudo install -d -m 755 /etc/dog-feeding-bot /var/lib/dog-feeding-bot /etc/letsencrypt/renewal-hooks/deploy && sudo install -m 755 /tmp/check-ssl-cert.sh /usr/local/bin/check-ssl-cert.sh && sudo install -m 755 /tmp/reload-nginx-renewal-hook.sh /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh && sudo install -m 644 /tmp/dog-feeding-ssl-monitor.service /etc/systemd/system/dog-feeding-ssl-monitor.service && sudo install -m 644 /tmp/dog-feeding-ssl-monitor.timer /etc/systemd/system/dog-feeding-ssl-monitor.timer && printf '%s\n' 'BOT_TOKEN_PROD=$BOT_TOKEN' 'SSL_ALERT_CHAT_ID=$ALERT_CHAT_ID' 'SSL_ALERT_DAYS=$ALERT_DAYS' 'SSL_DOMAIN=$SSL_DOMAIN' 'SSL_CERT_PATH=/etc/letsencrypt/live/$SSL_DOMAIN/cert.pem' 'SSL_ALERT_STATE_DIR=/var/lib/dog-feeding-bot' | sudo tee /etc/dog-feeding-bot/ssl-monitor.env >/dev/null && sudo systemctl daemon-reload && sudo systemctl enable --now dog-feeding-ssl-monitor.timer"

echo "SSL monitor установлен на $SERVER для домена $SSL_DOMAIN"
