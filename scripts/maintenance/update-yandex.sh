#!/bin/bash

# 🔄 Скрипт обновления Dog Feeding Bot в Yandex Cloud
#
# Использование:
#   ./scripts/maintenance/update-yandex.sh          - Обновление бота с созданием резервной копии
#   ./scripts/maintenance/update-yandex.sh setup-backup - Настройка регулярного резервного копирования

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Настройка регулярного резервного копирования через cron
setup_regular_backup() {
    print_status "Настраиваю регулярное резервное копирование..."
    
    ssh "$SSH_USER@$VM_IP" << 'EOF'
    # Создаем скрипт для резервного копирования
    cat > ~/backup-database.sh << 'SCRIPT'
#!/bin/bash
cd ~/dog-feeding-bot

# Проверяем существование файла базы данных
if [ ! -f "dog_feeding.db" ]; then
    echo "[$(date)] ❌ Файл базы данных не найден" >> ~/backup.log
    exit 1
fi

# Создаем имя файла резервной копии с временной меткой
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_NAME="dog_feeding_backup_${TIMESTAMP}.db"

# Копируем файл базы данных
cp dog_feeding.db "$BACKUP_NAME"

# Проверяем, что резервная копия создана успешно
if [ -f "$BACKUP_NAME" ]; then
    SIZE=$(stat -c%s "$BACKUP_NAME" 2>/dev/null || stat -f%z "$BACKUP_NAME")
    echo "[$(date)] ✅ Резервная копия создана: $BACKUP_NAME (размер: $SIZE байт)" >> ~/backup.log
    
    # Удаляем резервные копии старше 7 дней
    find . -name "dog_feeding_backup_*.db" -mtime +7 -delete
else
    echo "[$(date)] ❌ Ошибка создания резервной копии" >> ~/backup.log
    exit 1
fi
SCRIPT

    # Делаем скрипт исполняемым
    chmod +x ~/backup-database.sh
    
    # Добавляем задачу в cron для ежедневного выполнения в 2:00
    (crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-database.sh") | crontab -
    
    echo "✅ Регулярное резервное копирование настроено (ежедневно в 2:00)"
    echo "📝 Логи сохраняются в ~/backup.log"
    echo "🗑️  Резервные копии старше 7 дней автоматически удаляются"
EOF
}

# Резервное копирование базы данных
backup_database() {
    print_status "Создаю резервную копию базы данных..."
    
    ssh "$SSH_USER@$VM_IP" << 'EOF'
    cd ~/dog-feeding-bot
    
    # Проверяем существование файла базы данных
    if [ ! -f "dog_feeding.db" ]; then
        echo "❌ Файл базы данных не найден"
        exit 1
    fi
    
    # Создаем имя файла резервной копии с временной меткой
    TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
    BACKUP_NAME="dog_feeding_backup_${TIMESTAMP}.db"
    
    # Копируем файл базы данных
    cp dog_feeding.db "$BACKUP_NAME"
    
    # Проверяем, что резервная копия создана успешно
    if [ -f "$BACKUP_NAME" ]; then
        SIZE=$(stat -c%s "$BACKUP_NAME" 2>/dev/null || stat -f%z "$BACKUP_NAME")
        echo "✅ Резервная копия создана: $BACKUP_NAME (размер: $SIZE байт)"
        
        # Показываем информацию о последних резервных копиях
        echo "📋 Последние резервные копии:"
        ls -lt dog_feeding_backup_*.db 2>/dev/null | head -5 | while read line; do
            echo "  $line"
        done
    else
        echo "❌ Ошибка создания резервной копии"
        exit 1
    fi
EOF
}

# Загрузка конфигурации
if [ ! -f ".deploy-config" ]; then
    print_error "Файл конфигурации .deploy-config не найден"
    print_status "Запустите сначала ./scripts/deploy-yandex.sh"
    exit 1
fi

source .deploy-config

# Проверка аргументов командной строки
if [ "$1" = "setup-backup" ]; then
    setup_regular_backup
    exit 0
fi

print_status "Обновляю бота на VM $VM_IP..."

# Обновление проекта
ssh "$SSH_USER@$VM_IP" << 'EOF'
cd ~/dog-feeding-bot

echo "🔄 Получаю последние изменения..."
git pull

echo "📦 Устанавливаю зависимости..."
npm install

echo "🔨 Собираю проект..."
npm run build

echo "🔄 Перезапускаю бота..."
pm2 restart dog-feeding-bot

echo "✅ Обновление завершено"
EOF

# Создание резервной копии базы данных
backup_database

# Обновление проекта
ssh "$SSH_USER@$VM_IP" << 'EOF'
cd ~/dog-feeding-bot

echo "🔄 Получаю последние изменения..."
git pull

echo "📦 Устанавливаю зависимости..."
npm install

echo "🔨 Собираю проект..."
npm run build

echo "🔄 Перезапускаю бота..."
pm2 restart dog-feeding-bot

echo "✅ Обновление завершено"
EOF

print_success "Бот успешно обновлен!"

# Показать статус
print_status "Статус бота:"
ssh "$SSH_USER@$VM_IP" "pm2 status dog-feeding-bot"
