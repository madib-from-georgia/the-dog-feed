# 🚀 Быстрое развертывание с IP адресом

Эта инструкция поможет настроить бота для работы с IP адресом вместо домена.

## 📋 Что изменилось

- ❌ Убран SSL (HTTPS) — работаем только по HTTP
- 🏠 IP адрес вместо домена в nginx
- ⚙️ Упрощенная конфигурация

## 🛠️ Пошаговая настройка

### 1️⃣ На сервере: Настройка nginx

```bash
# Загрузите файлы на сервер и перейдите в папку проекта
cd /path/to/your/project

# Запустите скрипт настройки nginx для IP
./scripts/setup-nginx-ip.sh
```

### 2️⃣ Настройка переменных окружения

Создайте файл `.env` на основе `env.ip.example`:

```bash
cp env.ip.example .env
```

Отредактируйте `.env`:
```env
BOT_TOKEN=ваш_токен_бота
WEBHOOK_URL=http://89.169.189.202
WEBHOOK_PATH=/webhook
PORT=3000
NODE_ENV=production
```

### 3️⃣ Установка и запуск

```bash
# Установка зависимостей
npm install

# Сборка проекта
npm run build

# Запуск через PM2
pm2 start ecosystem.config.js --env production

# Проверка статуса
pm2 status
pm2 logs dog-feeding-bot
```

## 🔍 Проверка работы

### Telegram Webhook
```bash
# Проверка webhook в Telegram
curl "https://api.telegram.org/bot<ВАШ_BOT_TOKEN>/getWebhookInfo"
```

### Локальная проверка
```bash
# Проверка доступности webhook
curl -X POST http://89.169.189.202/webhook

# Проверка статуса приложения
curl http://89.169.189.202/status
```

### Проверка nginx
```bash
# Статус nginx
sudo systemctl status nginx

# Логи nginx
sudo tail -f /var/log/nginx/dog-bot-access.log
sudo tail -f /var/log/nginx/dog-bot-error.log
```

## ⚠️ Важные моменты

1. **Безопасность**: HTTP менее безопасен чем HTTPS
2. **Telegram**: Telegram поддерживает HTTP для webhooks в тестовых целях
3. **Firewall**: Убедитесь что порт 80 открыт на сервере
4. **IP адрес**: Замените `89.169.189.202` на ваш реальный IP если он другой

## 🐛 Решение проблем

### Webhook не работает
```bash
# Проверьте статус приложения
pm2 status

# Проверьте логи
pm2 logs dog-feeding-bot

# Проверьте nginx
sudo nginx -t
sudo systemctl status nginx
```

### 404 ошибка
```bash
# Проверьте что сайт включен
ls -la /etc/nginx/sites-enabled/

# Перезагрузите nginx
sudo systemctl reload nginx
```

### Приложение не запускается
```bash
# Проверьте переменные окружения
cat .env

# Проверьте порт (должен быть свободен)
sudo netstat -tulpn | grep :3000
```

## 📞 Полезные команды

```bash
# Перезапуск бота
pm2 restart dog-feeding-bot

# Просмотр логов в реальном времени
pm2 logs dog-feeding-bot --lines 100

# Перезагрузка nginx
sudo systemctl reload nginx

# Проверка webhook в Telegram
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
``` 
