# 📁 Скрипты для Dog Feeding Bot

Организованная коллекция скриптов для развертывания и поддержки Dog Feeding Bot в Yandex Cloud.

## 📂 Структура папок

### 🚀 [`deployment/`](deployment/) - Скрипты развертывания

Скрипты для первоначальной настройки и развертывания бота:

- `deploy-yandex.sh` - Основное развертывание с локального компьютера
- `setup-nginx-yandex.sh` - Настройка nginx с SSL сертификатом

### 🔧 [`maintenance/`](maintenance/) - Скрипты поддержки

Скрипты для мониторинга, диагностики и обслуживания:

- `status-yandex.sh` - Проверка статуса бота
- `logs-yandex.sh` - Просмотр логов
- `update-yandex.sh` - Обновление кода бота
- `setup-ssl-monitor-yandex.sh` - Установка SSL-мониторинга и alert'ов
- `diagnose-connectivity.sh` - Диагностика проблем подключения
- `reset-vm.sh` - Полный сброс VM (осторожно!)

## 🎯 Быстрый старт

### 1. Первое развертывание

```bash
# Полное развертывание бота
./scripts/deployment/deploy-yandex.sh

# Настройка SSL (включая DuckDNS домены)
./scripts/deployment/setup-nginx-yandex.sh yourdomain.com
```

### 2. Повседневная работа

```bash
# Проверка статуса
./scripts/maintenance/status-yandex.sh

# Просмотр логов
./scripts/maintenance/logs-yandex.sh

# Обновление кода
./scripts/maintenance/update-yandex.sh

# Установка SSL-мониторинга
./scripts/maintenance/setup-ssl-monitor-yandex.sh <telegram-chat-id>
```

### 3. Диагностика проблем

```bash
# Если что-то не работает
./scripts/maintenance/diagnose-connectivity.sh yourdomain.com
```

## 🔄 Типичные сценарии использования

### Новый проект

1. `deployment/deploy-yandex.sh` - развертывание
2. `deployment/setup-nginx-yandex.sh` - SSL (работает с любыми доменами)
3. `maintenance/setup-ssl-monitor-yandex.sh` - алерты и renewal hook
4. `maintenance/status-yandex.sh` - проверка

### Обновление кода

1. `maintenance/update-yandex.sh` - обновление
2. `maintenance/logs-yandex.sh` - проверка логов

### Устранение проблем

1. `maintenance/status-yandex.sh` - общий статус
2. `maintenance/diagnose-connectivity.sh` - диагностика
3. `maintenance/logs-yandex.sh` - анализ ошибок

### Полный пересброс (крайний случай)

1. `maintenance/reset-vm.sh` - сброс
2. `deployment/deploy-yandex.sh` - переразвертывание

## 📋 Требования

### Для deployment скриптов:

- SSH доступ к Yandex Cloud VM
- Настроенные SSH ключи
- Yandex Cloud CLI (для некоторых функций)

### Для maintenance скриптов:

- SSH доступ к VM
- Права sudo на VM (для некоторых операций)

## ⚠️ Важные замечания

- **Порядок выполнения:** Сначала deployment, потом maintenance
- **Права доступа:** Все скрипты должны быть исполняемыми (`chmod +x`)
- **SSH ключи:** Убедитесь в правильной настройке SSH
- **Security Groups:** Откройте необходимые порты в Yandex Cloud

## 🔗 Связанные файлы

- `nginx.yandex.conf` - конфигурация nginx
- `ecosystem.yandex.config.js` - конфигурация PM2
- `docs/SSL_TROUBLESHOOTING.md` - руководство по решению проблем SSL

## 📞 Поддержка

При проблемах:

1. Проверьте README в соответствующей папке
2. Запустите диагностику: `maintenance/diagnose-connectivity.sh`
3. Проверьте логи: `maintenance/logs-yandex.sh`
4. Изучите документацию в папке `docs/`
