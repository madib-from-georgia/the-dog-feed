#!/bin/bash

# Альтернативный метод получения SSL сертификата через webroot
# Не требует остановки nginx

set -e

echo "=== Метод 1: Попытка через webroot ==="

# Создаем директорию для webroot если её нет
ssh yc-user@89.169.189.202 "sudo mkdir -p /var/www/html/.well-known/acme-challenge"

# Пробуем получить сертификат через webroot
ssh yc-user@89.169.189.202 "sudo certbot certonly --webroot -w /var/www/html -d makishvili.duckdns.org --force-renewal --non-interactive --agree-tos --email admin@makishvili.duckdns.org" || {
    echo ""
    echo "=== Метод 2: Попытка через nginx plugin ==="
    ssh yc-user@89.169.189.202 "sudo certbot --nginx -d makishvili.duckdns.org --force-renewal --non-interactive --agree-tos --email admin@makishvili.duckdns.org" || {
        echo ""
        echo "=== Метод 3: Ручная проверка DNS ==="
        echo "Проверяем DNS с разных серверов:"
        
        echo "Google DNS (8.8.8.8):"
        dig @8.8.8.8 makishvili.duckdns.org +short
        
        echo "Cloudflare DNS (1.1.1.1):"
        dig @1.1.1.1 makishvili.duckdns.org +short
        
        echo "DuckDNS nameservers:"
        dig makishvili.duckdns.org NS +short
        
        echo ""
        echo "Если DNS не резолвится, нужно:"
        echo "1. Обновить IP в DuckDNS (нужен токен)"
        echo "2. Подождать 5-10 минут для распространения DNS"
        echo "3. Повторить попытку"
        
        exit 1
    }
}

echo ""
echo "=== Перезагрузка nginx ==="
ssh yc-user@89.169.189.202 "sudo systemctl reload nginx"

echo ""
echo "=== Проверка сертификата ==="
ssh yc-user@89.169.189.202 "sudo certbot certificates"

echo ""
echo "✓ Сертификат успешно получен!"
