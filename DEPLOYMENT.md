# Развертывание бота

Бот поддерживает два режима работы: локальная разработка (polling) и продакшен (webhook).

## 🇷🇺 Yandex Cloud

Для развертывания в Yandex Cloud смотрите:

- **[Быстрый старт](QUICK_DEPLOY_YANDEX.md)** - развертывание за 10 минут
- **[Подробная инструкция](YANDEX_CLOUD_DEPLOYMENT.md)** - полное руководство

## Локальная разработка

### Настройка

1. Скопируйте `env.example` в `.env`:

```bash
cp env.example .env
```

2. Заполните переменные в `.env`:

```env
BOT_TOKEN=your_telegram_bot_token_here
NODE_ENV=development
```

### Запуск

```bash
# Разработка с автоперезагрузкой
npm run dev

# Обычный запуск через ts-node
npm run dev:ts
```

## Продакшен

### Настройка

1. Настройте переменные окружения:

```env
BOT_TOKEN=your_telegram_bot_token_here
NODE_ENV=production
BOT_MODE=webhook
WEBHOOK_URL=https://yourdomain.com
WEBHOOK_PATH=/webhook
PORT=8080
```

### Развертывание

```bash
# Сборка
npm run build

# Запуск в продакшене
npm run start:prod

# Или всё в одной команде
npm run deploy
```

## Переменные окружения

| Переменная     | Обязательная      | Описание                              | Пример                   |
| -------------- | ----------------- | ------------------------------------- | ------------------------ |
| `BOT_TOKEN`    | ✅                | Токен Telegram бота                   | `123456:ABC-DEF...`      |
| `NODE_ENV`     | ❌                | Окружение (development/production)    | `production`             |
| `BOT_MODE`     | ❌                | Получение обновлений: polling/webhook | `webhook`                |
| `WEBHOOK_URL`  | ✅ для продакшена | URL домена для webhook                | `https://yourdomain.com` |
| `WEBHOOK_PATH` | ❌                | Путь для webhook                      | `/webhook`               |
| `PORT`         | ❌                | Порт для webhook сервера              | `8080`                   |

## Переключение между режимами

По умолчанию бот определяет режим работы по `NODE_ENV`:

- `development` → polling (опрос Telegram серверов)
- `production` → webhook (HTTP сервер для получения обновлений)

### Принудительное переключение режима

Если нужно запустить polling в продакшене, сохранив production-токен:

```bash
NODE_ENV=production BOT_MODE=polling npm start
```

При запуске polling Telegraf удаляет зарегистрированный webhook без очистки
накопившейся очереди обновлений. Одновременно использовать webhook и polling
для одного токена нельзя.

Если нужно тестировать webhook локально:

```bash
NODE_ENV=production WEBHOOK_URL=https://your-ngrok-url.ngrok.io npm run dev:ts
```

## Логи и мониторинг

Бот выводит информацию о режиме запуска:

```
Запуск в режиме: production
Запуск в режиме webhook:
  URL: https://yourdomain.com/webhook
  Port: 8080
Бот запущен в режиме webhook!
```

## Отладка

### Проверка webhook

Убедитесь, что webhook доступен:

```bash
curl -X POST https://yourdomain.com/webhook
```

### Проверка статуса бота

В Telegram выполните команду:

```
/status
```

### Админ команды

- `/notifications` - статистика уведомлений
- `/scheduler` - статистика планировщика
