# 🧪 Инструкция: Полное тестирование скриптов развертывания

## 🎯 Цель
Проверить самодостаточность скриптов развертывания, полностью очистив VM и установив все заново.

---

## 📋 Этап 1: Полная очистка VM

### 1.1 Подключение к VM
```bash
ssh yc-user@89.169.189.202
```

### 1.2 Остановка всех служб
```bash
# Остановка PM2 процессов
pm2 stop all
pm2 delete all
pm2 kill

# Остановка nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# Остановка certbot timer
sudo systemctl stop certbot.timer
sudo systemctl disable certbot.timer
```

### 1.3 Удаление установленных пакетов
```bash
# Удаление Node.js и npm
sudo apt remove --purge -y nodejs npm
sudo apt autoremove -y

# Удаление nginx
sudo apt remove --purge -y nginx nginx-common nginx-core

# Удаление certbot
sudo apt remove --purge -y certbot python3-certbot-nginx

# Удаление PM2 глобально (если остался)
sudo npm uninstall -g pm2 2>/dev/null || true

# Очистка автоудаления
sudo apt autoremove -y
sudo apt autoclean
```

### 1.4 Удаление конфигурационных файлов
```bash
# Удаление конфигураций nginx
sudo rm -rf /etc/nginx/
sudo rm -rf /var/log/nginx/

# Удаление SSL сертификатов
sudo rm -rf /etc/letsencrypt/

# Удаление проекта
rm -rf ~/dog-feeding-bot/
rm -rf ~/logs/
rm -rf ~/.pm2/

# Удаление Node.js остатков
sudo rm -rf /usr/local/lib/node_modules/
sudo rm -rf ~/.npm/
sudo rm -rf ~/.node-gyp/
```

### 1.5 Очистка firewall
```bash
# Сброс UFW правил
sudo ufw --force reset
sudo ufw disable
```

### 1.6 Очистка пользователя (опционально)
```bash
# Если нужно удалить созданного пользователя для бота
# sudo userdel -r botuser 2>/dev/null || true
```

### 1.7 Проверка очистки
```bash
# Проверяем, что все чисто
which node || echo "✅ Node.js удален"
which nginx || echo "✅ Nginx удален" 
which certbot || echo "✅ Certbot удален"
which pm2 || echo "✅ PM2 удален"
ls ~/dog-feeding-bot 2>/dev/null || echo "✅ Проект удален"
sudo nginx -t 2>/dev/null || echo "✅ Nginx конфиги удалены"
```

### 1.8 Выход с VM
```bash
exit
```

---

## 📋 Этап 2: Повторное развертывание с нуля

### 2.1 Очистка локальной конфигурации
```bash
# На локальном компьютере
cd ~/projects/the-dog-feed

# Удаляем локальную конфигурацию развертывания
rm -f .deploy-config .vm-info
```

### 2.2 Запуск полного развертывания
```bash
# Автоматическое развертывание всего проекта
./scripts/deploy-yandex.sh
```

**Скрипт запросит:**
- 🌐 IP адрес VM: `89.169.189.202`
- 👤 SSH пользователь: `yc-user` (по умолчанию)
- 🤖 BOT_TOKEN: `8001506263:AAGmRmVnstuJp34pQXdOuuRv-wRbAF-i5yI`
- 🔗 WEBHOOK_URL: `https://makishvili.duckdns.org`
- 🔌 PORT: `3000` (по умолчанию)
- 📂 Git repo: URL вашего репозитория

### 2.3 Настройка nginx с SSL
```bash
# Копируем файлы на VM
scp scripts/setup-nginx-yandex.sh yc-user@89.169.189.202:~/
scp nginx.yandex.conf yc-user@89.169.189.202:~/

# Подключаемся и запускаем настройку nginx
ssh yc-user@89.169.189.202
./setup-nginx-yandex.sh makishvili.duckdns.org
```

**На вопрос о продолжении SSL:** отвечайте `y`

---

## 📋 Этап 3: Проверка результата

### 3.1 Проверка статуса системы
```bash
# На локальном компьютере
./scripts/status-yandex.sh
```

### 3.2 Проверка webhook
```bash
curl -s "https://api.telegram.org/bot8001506263:AAGmRmVnstuJp34pQXdOuuRv-wRbAF-i5yI/getWebhookInfo" | jq .
```

**Ожидаемый результат:**
```json
{
  "ok": true,
  "result": {
    "url": "https://makishvili.duckdns.org/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "89.169.189.202"
  }
}
```

### 3.3 Проверка SSL
```bash
curl -I https://makishvili.duckdns.org/webhook
```

**Ожидаемый результат:**
```
HTTP/2 200
server: nginx
```

### 3.4 Проверка 404 для корня (нормально)
```bash
curl https://makishvili.duckdns.org
```

**Ожидаемый результат:** 404 (это правильно!)

### 3.5 Тестирование бота в Telegram
1. Найдите бота в Telegram
2. Отправьте `/start`
3. Проверьте ответ

---

## 📊 Чек-лист успешного развертывания

### ✅ Установленные компоненты:
- [ ] Node.js 18
- [ ] PM2 (глобально)
- [ ] Git
- [ ] Nginx
- [ ] Certbot
- [ ] SSL сертификат для домена

### ✅ Запущенные службы:
- [ ] PM2 процесс `dog-feeding-bot` (online)
- [ ] Nginx (active)
- [ ] UFW firewall (порты 22, 80, 443)
- [ ] Certbot timer (active)

### ✅ Файлы и конфигурации:
- [ ] `~/dog-feeding-bot/` - проект
- [ ] `~/dog-feeding-bot/.env` - переменные окружения
- [ ] `/etc/nginx/sites-enabled/dog-feeding-bot` - nginx конфиг
- [ ] `/etc/letsencrypt/live/makishvili.duckdns.org/` - SSL сертификаты

### ✅ Сетевые проверки:
- [ ] Webhook регистрирован в Telegram
- [ ] HTTPS работает
- [ ] Бот отвечает в Telegram

---

## 🚨 Возможные проблемы и решения

### Проблема: Node.js не устанавливается
```bash
# Проверка источников APT
ssh yc-user@89.169.189.202 "sudo apt update && curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
```

### Проблема: SSL сертификат не получается
```bash
# Проверка DNS
nslookup makishvili.duckdns.org
# Проверка доступности порта 80
ssh yc-user@89.169.189.202 "sudo ufw status"
```

### Проблема: PM2 процесс не запускается
```bash
# Проверка логов
./scripts/logs-yandex.sh
```

