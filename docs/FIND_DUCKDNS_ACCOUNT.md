# Как найти аккаунт DuckDNS

## Проблема

Вы не помните, через какой сервис (Twitter, GitHub, Google, Reddit) регистрировались на DuckDNS.

## Решение 1: Попробуйте все варианты входа

На https://www.duckdns.org попробуйте войти через:

1. **GitHub** - самый вероятный вариант (если вы разработчик)
2. **Google** - второй по популярности
3. **Twitter** 
4. **Reddit**

При правильном выборе вы увидите свой домен `makishvili` в списке доменов.

## Решение 2: Проверьте email

Поищите в почте письма от DuckDNS:
- Отправитель: `noreply@duckdns.org` или `support@duckdns.org`
- Тема может содержать: "DuckDNS", "domain", "makishvili"

В письмах может быть информация о том, через какой сервис вы входили.

## Решение 3: Проверьте браузер

Если вы входили в DuckDNS с этого компьютера:

### Chrome/Edge
1. Откройте `chrome://settings/passwords`
2. Найдите `duckdns.org`
3. Посмотрите сохраненные данные

### Firefox
1. Откройте `about:logins`
2. Найдите `duckdns.org`

### Safari
1. Настройки → Пароли
2. Найдите `duckdns.org`

## Решение 4: Проверьте историю браузера

1. Откройте историю браузера (Ctrl+H / Cmd+Y)
2. Найдите `duckdns.org`
3. Посмотрите URL - может быть что-то вроде:
   - `duckdns.org/login/twitter`
   - `duckdns.org/login/github`
   - и т.д.

## Решение 5: Создайте новый домен

Если не можете найти аккаунт, создайте новый:

### Шаг 1: Зарегистрируйтесь заново
1. Откройте https://www.duckdns.org
2. Войдите через любой удобный сервис (рекомендую GitHub)
3. Создайте новый домен (например, `makishvili-new`)

### Шаг 2: Обновите конфигурацию

Обновите файлы проекта с новым доменом:

**`.deploy-config`:**
```bash
WEBHOOK_URL=https://makishvili-new.duckdns.org
```

**`.env` на сервере:**
```bash
WEBHOOK_URL=https://makishvili-new.duckdns.org
```

**`nginx.yandex.conf`:**
```nginx
server_name makishvili-new.duckdns.org;
```

### Шаг 3: Обновите IP нового домена

```bash
curl "https://www.duckdns.org/update?domains=makishvili-new&token=НОВЫЙ_ТОКЕН&ip=89.169.189.202"
```

### Шаг 4: Получите SSL сертификат

```bash
ssh yc-user@89.169.189.202 "sudo systemctl stop nginx"
ssh yc-user@89.169.189.202 "sudo certbot certonly --standalone -d makishvili-new.duckdns.org --non-interactive --agree-tos --email admin@makishvili-new.duckdns.org"
ssh yc-user@89.169.189.202 "sudo systemctl start nginx"
```

## Решение 6: Используйте альтернативный DNS

Если DuckDNS не подходит, рассмотрите альтернативы:

### Бесплатные варианты:
1. **Cloudflare** (рекомендуется)
   - Бесплатный DNS + CDN
   - Быстрое распространение
   - Надежный
   
2. **No-IP**
   - Бесплатный динамический DNS
   - Требует подтверждения каждые 30 дней

3. **FreeDNS (afraid.org)**
   - Полностью бесплатный
   - Много доменных зон

### Платные варианты:
1. **Купить домен** (~$10/год)
   - Namecheap, GoDaddy, Reg.ru
   - Полный контроль
   - Профессиональный вид

## Рекомендация

Если не можете найти старый аккаунт в течение 10-15 минут:
1. **Создайте новый домен на DuckDNS** (самый быстрый способ)
2. Или **купите домен** (более надежное долгосрочное решение)

Старый домен `makishvili.duckdns.org` можно будет удалить позже, если найдете доступ.
