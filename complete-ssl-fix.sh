#!/bin/bash

# Скрипт для завершения исправления SSL сертификата
# Выполнять после 15.01.2026 14:41 МСК (11:41 UTC)

set -e

SERVER="yc-user@89.169.189.202"
BOT_TOKEN="8001506263:AAGmRmVnstuJp34pQXdOuuRv-wRbAF-i5yI"

echo "=== Шаг 1: Подготовка webroot и hook для auto-renew ==="
ssh $SERVER "sudo mkdir -p /var/www/html/.well-known/acme-challenge /etc/letsencrypt/renewal-hooks/deploy && printf '%s\n' '#!/bin/sh' 'systemctl reload nginx' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null && sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh"
echo "✓ Webroot и deploy hook готовы"

echo ""
echo "=== Шаг 2: Получение нового SSL сертификата ==="
ssh $SERVER "sudo certbot certonly --webroot -w /var/www/html -d makishvili.duckdns.org --cert-name makishvili.duckdns.org --force-renewal --non-interactive --agree-tos --email admin@makishvili.duckdns.org"
echo "✓ Сертификат получен"

echo ""
echo "=== Шаг 3: Перезагрузка nginx с новым сертификатом ==="
ssh $SERVER "sudo systemctl reload nginx"
echo "✓ Nginx перезагружен"

echo ""
echo "=== Шаг 4: Проверка статуса nginx ==="
ssh $SERVER "sudo systemctl status nginx --no-pager"

echo ""
echo "=== Шаг 5: Восстановление webhook Telegram ==="
WEBHOOK_RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=https://makishvili.duckdns.org/webhook")
echo "Ответ setWebhook:"
echo "$WEBHOOK_RESPONSE" | jq .

echo ""
echo "=== Шаг 6: Проверка webhook ==="
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
echo "Информация о webhook:"
echo "$WEBHOOK_INFO" | jq .

echo ""
echo "=== Шаг 7: Проверка SSL ==="
curl -I https://makishvili.duckdns.org/webhook

echo ""
echo "=== Шаг 8: Проверка статуса бота ==="
ssh $SERVER "pm2 status dog-feeding-bot"

echo ""
echo "=== Шаг 9: Проверка автоматического обновления certbot ==="
ssh $SERVER "sudo systemctl status certbot.timer --no-pager && sudo certbot renew --dry-run --run-deploy-hooks"

echo ""
echo "=== ✓ Все шаги выполнены успешно! ==="
