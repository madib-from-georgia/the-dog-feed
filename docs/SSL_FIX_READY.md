# SSL Fix - Готово к выполнению

## Текущий статус (15.01.2026, 14:36 МСК)

⏰ **Необходимо подождать до: 14:41 МСК (11:41 UTC)**

Лимит Let's Encrypt еще не истек. Осталось подождать ~5 минут.

## Что делать после 14:41 МСК

### Вариант 1: Автоматический (Рекомендуется)

Просто запустите:

```bash
./complete-ssl-fix.sh
```

Скрипт автоматически выполнит все необходимые шаги и проверки.

### Вариант 2: Ручной

```bash
# 1. Подготовить webroot и hook для автообновления
ssh yc-user@89.169.189.202 "sudo mkdir -p /var/www/html/.well-known/acme-challenge /etc/letsencrypt/renewal-hooks/deploy && printf '%s\\n' '#!/bin/sh' 'systemctl reload nginx' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null && sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh"

# 2. Получить сертификат
ssh yc-user@89.169.189.202 "sudo certbot certonly --webroot -w /var/www/html -d makishvili.duckdns.org --cert-name makishvili.duckdns.org --force-renewal --non-interactive --agree-tos --email admin@makishvili.duckdns.org"

# 3. Перезагрузить nginx
ssh yc-user@89.169.189.202 "sudo systemctl reload nginx"

# 4. Восстановить webhook
BOT_TOKEN="8001506263:AAGmRmVnstuJp34pQXdOuuRv-wRbAF-i5yI"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=https://makishvili.duckdns.org/webhook" | jq .
```

## Что уже сделано

✅ Nginx временно остановлен и запущен обратно (чтобы сервер работал во время ожидания)
✅ Создан автоматический скрипт [`complete-ssl-fix.sh`](../complete-ssl-fix.sh)
✅ Обновлены инструкции в [`SSL_FIX_INSTRUCTIONS.md`](SSL_FIX_INSTRUCTIONS.md)

## Ожидаемый результат

После успешного выполнения:

- ✅ Новый SSL сертификат установлен
- ✅ Nginx работает с новым сертификатом
- ✅ Webhook Telegram восстановлен
- ✅ Бот полностью функционален

## Проверка после выполнения

```bash
# Проверить SSL
curl -I https://makishvili.duckdns.org/webhook

# Проверить webhook
curl -s "https://api.telegram.org/bot8001506263:AAGmRmVnstuJp34pQXdOuuRv-wRbAF-i5yI/getWebhookInfo" | jq .

# Проверить бота
ssh yc-user@89.169.189.202 "pm2 status dog-feeding-bot"
```

## Важно

- Не запускайте скрипт до 14:41 МСК, иначе получите ошибку лимита
- После 14:41 МСК можно выполнять сразу
- Скрипт автоматически проверит все компоненты
- Для будущих продлений используйте `webroot`, а не `standalone`
