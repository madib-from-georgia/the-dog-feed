# Инструкция по исправлению SSL сертификата

## Текущая ситуация (15.01.2026, 14:45 МСК)

SSL сертификат для `makishvili.duckdns.org` истек **14 января 2026**.

### Проблема 1: Лимит Let's Encrypt

✅ **Решено:** Время ожидания (14:41 МСК) прошло, лимит снят.

### Проблема 2: DNS не резолвится (КРИТИЧНО)

❌ **Текущая проблема:** `DNS problem: SERVFAIL looking up A for makishvili.duckdns.org`

**Диагностика:**

- ✅ Google DNS (8.8.8.8): Резолвится → 89.169.189.202
- ❌ Cloudflare DNS (1.1.1.1): Не резолвится (пустой ответ)
- Let's Encrypt использует DNS серверы, которые не получают обновления от DuckDNS

**Решение:** См. [`DNS_FIX_FOR_SSL.md`](DNS_FIX_FOR_SSL.md)

### Причина неудачных попыток

DNS проблема: `SERVFAIL looking up A for makishvili.duckdns.org` - временные проблемы с nameservers DuckDNS.

## Почему баг повторился снова (16.04.2026)

- `certbot.timer` был включен, но сертификат был выпущен через `standalone`
- Автоматический `certbot renew` запускался при работающем `nginx` и падал с ошибкой `Could not bind TCP port 80`
- В итоге сертификат не обновился автоматически и webhook снова начал падать на `certificate verify failed`

## Актуальное исправление

- Использовать `webroot` вместо `standalone`
- Оставлять `nginx` запущенным во время выпуска/продления
- После успешного продления автоматически делать `systemctl reload nginx`

## Что уже сделано

✅ Webhook Telegram удален и очередь обновлений очищена
✅ Nginx работает корректно
✅ DNS резолвится правильно (89.169.189.202)
✅ Конфигурация nginx без ошибок

## Шаги для завершения исправления

### АВТОМАТИЧЕСКИЙ СПОСОБ (Рекомендуется)

После 14:41 МСК выполните готовый скрипт:

```bash
./complete-ssl-fix.sh
```

Этот скрипт автоматически выполнит все необходимые шаги:

- Подготовит webroot и deploy hook для `nginx reload`
- Получит новый SSL сертификат через `webroot`
- Перезагрузит nginx
- Восстановит webhook Telegram
- Проверит работоспособность всех компонентов

### РУЧНОЙ СПОСОБ

После 14:41 МСК выполните:

```bash
# 1. Подключитесь к серверу
ssh yc-user@89.169.189.202

# 2. Подготовьте webroot и hook для автообновления
sudo mkdir -p /var/www/html/.well-known/acme-challenge /etc/letsencrypt/renewal-hooks/deploy
printf '%s\n' '#!/bin/sh' 'systemctl reload nginx' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# 3. Получите новый сертификат
sudo certbot certonly --webroot -w /var/www/html -d makishvili.duckdns.org --cert-name makishvili.duckdns.org --force-renewal --non-interactive --agree-tos --email admin@makishvili.duckdns.org

# 4. Перезагрузите nginx
sudo systemctl reload nginx

# 5. Проверьте статус nginx
sudo systemctl status nginx
```

### Затем восстановите webhook:

```bash
# На локальной машине
BOT_TOKEN="8001506263:AAGmRmVnstuJp34pQXdOuuRv-wRbAF-i5yI"

# Установите webhook
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=https://makishvili.duckdns.org/webhook" | jq .

# Проверьте статус webhook
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq .
```

### Проверка работоспособности:

```bash
# 1. Проверить SSL
curl -I https://makishvili.duckdns.org/webhook

# 2. Проверить webhook (должен показывать pending_update_count: 0)
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq .

# 3. Проверить статус бота
ssh yc-user@89.169.189.202 "pm2 status dog-feeding-bot"
```

## Альтернативный метод (если standalone не работает)

Используйте готовый скрипт fix-ssl.sh:

```bash
# На локальной машине
scp fix-ssl.sh yc-user@89.169.189.202:/tmp/
ssh yc-user@89.169.189.202 "chmod +x /tmp/fix-ssl.sh && /tmp/fix-ssl.sh"
```

## Автоматическое обновление в будущем

Certbot должен автоматически обновлять сертификаты через `webroot` и затем делать `nginx reload`. Проверьте таймер:

```bash
ssh yc-user@89.169.189.202 "sudo systemctl status certbot.timer"
```

Если таймер не активен:

```bash
ssh yc-user@89.169.189.202 "sudo systemctl enable certbot.timer && sudo systemctl start certbot.timer"
```

Проверьте, что автообновление теперь действительно проходит:

```bash
ssh yc-user@89.169.189.202 "sudo certbot renew --dry-run --run-deploy-hooks"
```

## Мониторинг истечения сертификата

На сервер добавлен отдельный `systemd timer`, который раз в сутки проверяет срок действия сертификата и отправляет Telegram-алерт заранее.

В репозитории для этого теперь есть полный набор файлов:

- `scripts/maintenance/check-ssl-cert.sh`
- `scripts/maintenance/dog-feeding-ssl-monitor.service`
- `scripts/maintenance/dog-feeding-ssl-monitor.timer`
- `scripts/maintenance/reload-nginx-renewal-hook.sh`
- `scripts/maintenance/ssl-monitor.env.example`
- `scripts/maintenance/setup-ssl-monitor-yandex.sh`

Повторная установка серверной части из исходников:

```bash
./scripts/maintenance/setup-ssl-monitor-yandex.sh <telegram-chat-id> makishvili.duckdns.org 14
```

Проверка статуса:

```bash
ssh yc-user@89.169.189.202 "sudo systemctl status dog-feeding-ssl-monitor.timer --no-pager"
ssh yc-user@89.169.189.202 "sudo systemctl status dog-feeding-ssl-monitor.service --no-pager"
```

Проверка текста алерта без отправки сообщения:

```bash
ssh yc-user@89.169.189.202 "sudo sh -c 'set -a; . /etc/dog-feeding-bot/ssl-monitor.env; set +a; SSL_ALERT_DAYS=120 SSL_ALERT_DRY_RUN=1 /usr/local/bin/check-ssl-cert.sh'"
```

## Важные заметки

- Сертификаты Let's Encrypt действуют 90 дней
- Лимит неудачных попыток: 5 за час
- DNS должен корректно резолвиться перед получением сертификата
- `webroot` безопаснее для автопродления, потому что не конфликтует с работающим `nginx`
