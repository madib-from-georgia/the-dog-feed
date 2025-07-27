# 🔒 Руководство по исправлению ошибок SSL

## ❌ Типичная ошибка: "Timeout during connect"

```
Domain: yourdomain.com
Type: connection
Detail: IP: Fetching http://yourdomain.com/.well-known/acme-challenge/XXX: Timeout during connect (likely firewall problem)
```

## 🔧 Пошаговое исправление

### 1. 🔍 Диагностика проблемы

Запустите скрипт диагностики:

```bash
./scripts/maintenance/diagnose-connectivity.sh yourdomain.com
```

### 2. 🔥 Откройте порты в Yandex Cloud Security Groups

**Обязательно!** В Yandex Cloud Console:

1. Перейдите: **Compute Cloud** → **Виртуальные машины**
2. Найдите вашу VM и кликните на неё
3. Перейдите на вкладку **Группы безопасности**
4. Создайте или отредактируйте Security Group с правилами:

```
Входящий трафик:
- TCP/22 (SSH)    | Источник: 0.0.0.0/0
- TCP/80 (HTTP)   | Источник: 0.0.0.0/0  ← ВАЖНО!
- TCP/443 (HTTPS) | Источник: 0.0.0.0/0  ← ВАЖНО!

Исходящий трафик:
- Все протоколы   | Назначение: 0.0.0.0/0
```

### 3. 🌐 Проверьте DNS настройки

Убедитесь что домен указывает на IP вашего сервера:

```bash
# Получите IP сервера
curl https://ipv4.icanhazip.com

# Проверьте DNS
dig +short yourdomain.com A
```

Если IP не совпадают - обновите DNS записи у вашего регистратора домена.

### 4. 🛡️ Настройте локальный firewall

```bash
# Если UFW активен
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Проверьте статус
sudo ufw status
```

### 5. ⚙️ Проверьте nginx

```bash
# Статус сервиса
sudo systemctl status nginx

# Проверка конфигурации
sudo nginx -t

# На каких портах слушает
sudo netstat -tlnp | grep :80
```

### 6. 🔄 Повторная попытка SSL

После исправления всех проблем:

```bash
./scripts/deployment/setup-nginx-yandex.sh yourdomain.com
```

## 🆘 Частые проблемы и решения

### Проблема: DNS не обновился

**Решение:** Подождите 10-60 минут для распространения DNS

### Проблема: Nginx не слушает на внешних интерфейсах

**Решение:** Проверьте конфигурацию `listen 80;` (не `127.0.0.1:80`)

### Проблема: Порты заблокированы в Security Groups

**Решение:** Обязательно откройте TCP/80 и TCP/443 для 0.0.0.0/0

### Проблема: Webroot недоступен

**Решение:**

```bash
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

## 🎯 Быстрая проверка

После исправления всех проблем проверьте:

```bash
# Домен доступен по HTTP
curl -I http://yourdomain.com/

# Если получили ответ 200 - можно получать SSL!
./scripts/deployment/setup-nginx-yandex.sh yourdomain.com
```

## 🔗 Полезные ссылки

- [Yandex Cloud Console](https://console.cloud.yandex.ru/)
- [DNS checker](https://www.whatsmydns.net/)
- [SSL test](https://www.ssllabs.com/ssltest/)
- [Let's Encrypt Community](https://community.letsencrypt.org/)

## 📞 Если ничего не помогает

1. Запустите диагностику: `./scripts/maintenance/diagnose-connectivity.sh`
2. Проверьте логи: `sudo tail -f /var/log/nginx/error.log`
3. Проверьте логи certbot: `sudo tail -f /var/log/letsencrypt/letsencrypt.log`
