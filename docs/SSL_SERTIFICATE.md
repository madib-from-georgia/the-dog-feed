# 🔧 Инструкция по исправлению проблем с SSL сертификатом Telegram webhook

## 📋 Симптомы проблемы

Если вы видите подобный вывод при проверке webhook:

```json
{
  "ok": true,
  "result": {
    "url": "https://makishvili.duckdns.org/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 65,
    "last_error_date": 1760633849,
    "last_error_message": "SSL error {error:0A000086:SSL routines::certificate verify failed}",
    "max_connections": 40,
    "ip_address": "89.169.189.202"
  }
}
```

**Основные признаки:**
- `last_error_message` содержит "certificate verify failed"
- `pending_update_count` > 0 (накопились необработанные обновления)
- При попытке curl к webhook: "SSL certificate problem: certificate has expired"

## 🚀 Пошаговое исправление

### Шаг 1: Диагностика SSL сертификата

```bash
# Проверить статус сертификата
curl -I https://makishvili.duckdns.org/webhook

# Проверить даты действия сертификата
openssl s_client -connect makishvili.duckdns.org:443 -servername makishvili.duckdns.org </dev/null 2>/dev/null | openssl x509 -noout -dates
```

**Ожидаемый результат:** Если сертификат истек, увидите даты в прошлом.

### Шаг 2: Очистка накопившихся обновлений Telegram

```bash
# Получить BOT_TOKEN из .deploy-config или .env
BOT_TOKEN="8001506263:AAGmRmVnstuJp34pQXdOuuRv-wRbAF-i5yI"

# Удалить webhook для очистки очереди
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook" | jq .

# Проверить, что очередь очистилась
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=1" | jq '.result | length'

# Очистить все накопившиеся обновления
LAST_UPDATE_ID=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates" | jq -r '.result[-1].update_id')
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=$((LAST_UPDATE_ID + 1))" | jq '.result | length'
```

**Ожидаемый результат:** Количество обновлений должно стать 0.

### Шаг 3: Подключение к серверу и диагностика nginx

```bash
# Подключиться к серверу (данные из .deploy-config)
ssh yc-user@89.169.189.202

# Проверить статус nginx
sudo systemctl status nginx
sudo nginx -t

# Проверить активные конфигурации
ls -la /etc/nginx/sites-enabled/
```

**Возможные проблемы:**
- Конфликт конфигураций (несколько файлов с одинаковым server_name)
- Nginx не запущен
- Ошибки в конфигурации

### Шаг 4: Устранение конфликтов nginx (если есть)

```bash
# Если есть temp-setup или другие конфликтующие конфигурации
sudo rm /etc/nginx/sites-enabled/temp-setup

# Проверить и перезагрузить
sudo nginx -t
sudo systemctl reload nginx
```

### Шаг 5: Обновление SSL сертификата

**Метод 1: Через webroot (предпочтительный)**

```bash
# Убедиться, что webroot доступен
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Попробовать обновить сертификат
sudo certbot certonly --webroot -w /var/www/html -d makishvili.duckdns.org --force-renewal --non-interactive --agree-tos --email admin@makishvili.duckdns.org
```

**Метод 2: Через standalone (если webroot не работает)**

```bash
# Остановить nginx
sudo systemctl stop nginx

# Получить сертификат
sudo certbot certonly --standalone -d makishvili.duckdns.org --force-renewal --non-interactive --agree-tos --email admin@makishvili.duckdns.org

# Запустить nginx обратно
sudo systemctl start nginx
```

**Ожидаемый результат:** 
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/makishvili.duckdns.org/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/makishvili.duckdns.org/privkey.pem
This certificate expires on 2026-01-14.
```

### Шаг 6: Проверка работы SSL

```bash
# Проверить SSL соединение
curl -I https://makishvili.duckdns.org/webhook

# Проверить статус бота
pm2 status dog-feeding-bot
```

**Ожидаемый результат:** HTTP/2 ответ без SSL ошибок.

### Шаг 7: Восстановление Telegram webhook

```bash
# Установить webhook обратно
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=https://makishvili.duckdns.org/webhook" | jq .

# Проверить статус webhook
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq .
```

**Ожидаемый результат:**
```json
{
  "ok": true,
  "result": {
    "url": "https://makishvili.duckdns.org/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40,
    "ip_address": "89.169.189.202"
  }
}
```

## 🔧 Автоматизированный скрипт

Для быстрого исправления можно использовать существующий скрипт:

```bash
# На локальной машине
./scripts/deployment/setup-nginx-yandex.sh makishvili.duckdns.org
```

**Примечание:** Скрипт может зависнуть на пользовательском вводе. В этом случае:
1. Завершить процесс: `ssh yc-user@89.169.189.202 "sudo pkill -f setup-nginx-yandex.sh"`
2. Выполнить шаги вручную по инструкции выше

## 🚨 Частые ошибки и решения

### Ошибка: "Another instance of Certbot is already running"
```bash
ssh yc-user@89.169.189.202 "sudo pkill -f certbot"
```

### Ошибка: "conflicting server name" в nginx
```bash
# Найти конфликтующие конфигурации
ssh yc-user@89.169.189.202 "ls -la /etc/nginx/sites-enabled/"

# Удалить временные конфигурации
ssh yc-user@89.169.189.202 "sudo rm /etc/nginx/sites-enabled/temp-setup"
```

### Ошибка: DNS timeout при получении сертификата
- Использовать standalone метод вместо webroot
- Проверить, что домен действительно указывает на сервер

### Ошибка: Webroot недоступен
```bash
# Создать и настроить webroot
ssh yc-user@89.169.189.202 "sudo mkdir -p /var/www/html/.well-known/acme-challenge && sudo chown -R www-data:www-data /var/www/html && sudo chmod -R 755 /var/www/html"
```

## 📅 Профилактика

1. **Мониторинг сертификата:** Сертификаты Let's Encrypt действуют 90 дней
2. **Автообновление:** Certbot автоматически обновляет сертификаты каждые 12 часов
3. **Проверка webhook:** Регулярно проверяйте статус webhook командой:
   ```bash
   curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq .
   ```

## 🎯 Быстрая проверка работоспособности

После исправления выполните:

```bash
# 1. Проверить SSL
curl -I https://makishvili.duckdns.org/webhook

# 2. Проверить webhook
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq .

# 3. Проверить статус бота
ssh yc-user@89.169.189.202 "pm2 status dog-feeding-bot"
```

Все команды должны выполняться без ошибок, webhook должен показывать `pending_update_count: 0` и отсутствие `last_error_message`.
