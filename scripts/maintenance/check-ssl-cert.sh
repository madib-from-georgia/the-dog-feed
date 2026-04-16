#!/bin/sh

set -eu

DOMAIN="${SSL_DOMAIN:-makishvili.duckdns.org}"
CERT_PATH="${SSL_CERT_PATH:-/etc/letsencrypt/live/${DOMAIN}/cert.pem}"
ALERT_DAYS="${SSL_ALERT_DAYS:-14}"
STATE_DIR="${SSL_ALERT_STATE_DIR:-/var/lib/dog-feeding-bot}"
STATE_FILE="${STATE_DIR}/ssl-cert-alert-state"
DRY_RUN="${SSL_ALERT_DRY_RUN:-0}"

BOT_TOKEN="${BOT_TOKEN_PROD:-${BOT_TOKEN:-}}"
ALERT_CHAT_ID="${SSL_ALERT_CHAT_ID:-${ADMIN_CHAT_ID:-}}"

if [ ! -f "$CERT_PATH" ]; then
  exit 1
fi

if [ -z "$BOT_TOKEN" ] || [ -z "$ALERT_CHAT_ID" ]; then
  exit 1
fi

mkdir -p "$STATE_DIR"

expiry_epoch=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2 | xargs -I{} date -d "{}" "+%s")
now_epoch=$(date "+%s")
days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

if [ "$days_left" -gt "$ALERT_DAYS" ]; then
  rm -f "$STATE_FILE"
  exit 0
fi

state_key="${DOMAIN}:${expiry_epoch}"
if [ -f "$STATE_FILE" ] && [ "$(tr -d '\n' < "$STATE_FILE")" = "$state_key" ]; then
  exit 0
fi

message="SSL certificate for ${DOMAIN} expires in ${days_left} day(s) on $(date -d "@${expiry_epoch}" "+%Y-%m-%d %H:%M:%S %Z")."

if [ "$DRY_RUN" = "1" ]; then
  printf '%s\n' "$message"
  exit 0
fi

curl -fsS -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d "chat_id=${ALERT_CHAT_ID}" \
  --data-urlencode "text=${message}" \
  >/dev/null

printf '%s\n' "$state_key" > "$STATE_FILE"
