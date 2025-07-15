# 🚀 Полное руководство по развертыванию Dog Feeding Bot

## 📋 Варианты развертывания

1. **[Автоматическое развертывание в Yandex Cloud](#автоматическое-развертывание-в-yandex-cloud)** (рекомендуется)
2. [Ручное развертывание](../QUICK_DEPLOY_YANDEX.md)
3. [Локальное развертывание](#локальное-развертывание)

---

## 🤖 Автоматическое развертывание в Yandex Cloud

### Что делает автоматический скрипт:
- ✅ Проверяет зависимости на вашем компьютере
- ✅ Подключается к VM и устанавливает Node.js, PM2, git
- ✅ Клонирует ваш проект на VM
- ✅ Настраивает переменные окружения
- ✅ Собирает и запускает бота
- ✅ Настраивает firewall и автозапуск
- ✅ Проверяет работоспособность

### Шаг 1: Подготовка

1. **Создайте VM в Yandex Cloud:**
   - Ubuntu 22.04 LTS
   - 2 vCPU, 2GB RAM минимум
   - Публичный IP адрес
   - SSH ключ для доступа

2. **Создайте Telegram бота:**
   ```
   1. Напишите @BotFather в Telegram
   2. Создайте бота командой /newbot
   3. Сохраните токен бота
   ```

3. **Подготовьте Git репозиторий:**
   ```bash
   # Убедитесь что ваш код загружен в Git
   git add .
   git commit -m "Подготовка к развертыванию"
   git push origin main
   ```

### Шаг 2: Запуск автоматического развертывания

```bash
# Запустите интерактивный скрипт развертывания
npm run deploy:yandex
```

Скрипт запросит у вас:
- 🌐 IP адрес VM
- 👤 Пользователь SSH (по умолчанию: yc-user)
- 🤖 Токен Telegram бота
- 🔗 URL для webhook
- 🔌 Порт (по умолчанию: 3000)
- 📂 URL Git репозитория

### Шаг 3: Проверка развертывания

После завершения скрипта:

```bash
# Проверка статуса бота
npm run status:yandex

# Просмотр логов
npm run logs:yandex

# Просмотр последних 100 строк логов
npm run logs:yandex 100
```

### Шаг 4: Обновление бота

```bash
# Обновление до последней версии
npm run update:yandex
```

---

## 🔧 Управление развернутым ботом

### Основные команды

| Команда | Описание |
|---------|----------|
| `npm run status:yandex` | Проверка статуса бота и системы |
| `npm run logs:yandex` | Просмотр логов |
| `npm run update:yandex` | Обновление бота |
| `ssh yc-user@YOUR_IP` | Прямое подключение к VM |

### SSH команды на VM

```bash
# Подключение к VM
ssh yc-user@YOUR_VM_IP

# Управление ботом через PM2
pm2 status                    # Статус всех процессов
pm2 logs dog-feeding-bot      # Логи бота
pm2 restart dog-feeding-bot   # Перезапуск бота
pm2 stop dog-feeding-bot      # Остановка бота
pm2 start dog-feeding-bot     # Запуск бота

# Мониторинг системы
htop                          # Мониторинг процессов
df -h                         # Использование диска
free -h                       # Использование памяти
```

---

## 🌐 Настройка домена (опционально)

### Если у вас есть собственный домен:

1. **Направьте A-запись на IP вашей VM**

2. **Установите nginx и SSL сертификат:**
   ```bash
   ssh yc-user@YOUR_VM_IP
   
   # Установка nginx и certbot
   sudo apt install nginx certbot python3-certbot-nginx
   
   # Копирование конфигурации nginx
   sudo cp ~/dog-feeding-bot/nginx.yandex.conf /etc/nginx/sites-available/dog-feeding-bot
   sudo ln -s /etc/nginx/sites-available/dog-feeding-bot /etc/nginx/sites-enabled/
   
   # Редактирование конфигурации (замените your-domain.com)
   sudo nano /etc/nginx/sites-available/dog-feeding-bot
   
   # Получение SSL сертификата
   sudo certbot --nginx -d yourdomain.com
   sudo systemctl reload nginx
   ```

3. **Обновите переменные окружения:**
   ```bash
   # На VM отредактируйте .env файл
   nano ~/dog-feeding-bot/.env
   
   # Измените WEBHOOK_URL на ваш домен
   WEBHOOK_URL=https://yourdomain.com
   
   # Перезапустите бота
   pm2 restart dog-feeding-bot
   ```

---

## 💻 Локальное развертывание

### Для разработки и тестирования:

1. **Установите зависимости:**
   ```bash
   npm install
   ```

2. **Создайте .env файл:**
   ```bash
   cp env.example .env
   nano .env
   ```

3. **Настройте переменные:**
   ```env
   BOT_TOKEN=your_telegram_bot_token
   NODE_ENV=development
   PORT=3000
   ```

4. **Запустите в режиме разработки:**
   ```bash
   # С автоперезагрузкой
   npm run dev
   
   # Или без автоперезагрузки
   npm run dev:ts
   ```

---

## 🛟 Решение проблем

### Проблемы с развертыванием

**❌ Не удается подключиться к VM:**
```bash
# Проверьте SSH соединение
ssh -v yc-user@YOUR_VM_IP

# Убедитесь что SSH ключ правильный
ssh-add -l

# Проверьте Security Groups в Yandex Cloud
```

**❌ Бот не запускается:**
```bash
# Проверьте логи на VM
ssh yc-user@YOUR_VM_IP "pm2 logs dog-feeding-bot --lines 50"

# Проверьте переменные окружения
ssh yc-user@YOUR_VM_IP "cat ~/dog-feeding-bot/.env"

# Перезапустите бота
npm run update:yandex
```

**❌ Webhook не работает:**
```bash
# Проверьте firewall
ssh yc-user@YOUR_VM_IP "sudo ufw status"

# Проверьте что порт открыт
ssh yc-user@YOUR_VM_IP "netstat -tlnp | grep 3000"

# Проверьте webhook в Telegram
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
```

### Проблемы в работе

**❌ База данных заблокирована:**
```bash
ssh yc-user@YOUR_VM_IP
cd ~/dog-feeding-bot
pm2 stop dog-feeding-bot
sleep 5
pm2 start dog-feeding-bot
```

**❌ Нехватка памяти:**
```bash
# Увеличьте память VM в Yandex Cloud
# Или настройте ограничения в ecosystem.yandex.config.js
```

**❌ Бот не отвечает на команды:**
```bash
# Проверьте логи на ошибки
npm run logs:yandex

# Перезапустите бота
npm run update:yandex

# Проверьте статус
npm run status:yandex
```

---

## 💰 Стоимость в Yandex Cloud

**Примерная стоимость:**
- VM (2 vCPU, 2GB): ~600₽/месяц
- Публичный IP: ~200₽/месяц
- **Итого: ~800₽/месяц**

**💡 Совет:** Первые 30 дней при регистрации в Yandex Cloud бесплатно!

---

## 🔍 Мониторинг и логи

### Автоматический мониторинг
```bash
# Полная диагностика системы и бота
npm run status:yandex
```

### Просмотр логов
```bash
# Последние 50 строк
npm run logs:yandex

# Последние 200 строк
npm run logs:yandex 200

# Логи в реальном времени
ssh yc-user@YOUR_VM_IP "pm2 logs dog-feeding-bot --follow"
```

### Экспорт данных
```bash
# Подключитесь к VM и выгрузите базу данных
ssh yc-user@YOUR_VM_IP
cd ~/dog-feeding-bot
# Экспорт доступен через бота командой /export
```

---

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи: `npm run logs:yandex`
2. Проверьте статус: `npm run status:yandex`
3. Перезапустите бота: `npm run update:yandex`
4. Изучите [документацию по решению проблем](#решение-проблем)

**Помните:** конфигурация сохраняется в файле `.deploy-config`, не удаляйте его! 
