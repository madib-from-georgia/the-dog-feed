# Этап 1: Базовый бот

## Цель этапа
Создать минимальный работающий телеграм-бот с одной кнопкой "Я покормил", который может принимать команды и отвечать пользователям.

## Результат этапа
Работающий бот, который:
- Запускается и подключается к Telegram
- Отвечает на команду `/start`
- Показывает кнопку "Я покормил"
- При нажатии кнопки отправляет сообщение "Собаку покормили"
- Хранит данные о кормлениях в памяти

## Файлы для создания

### 1. `package.json`
```json
{
  "name": "dog-feeding-bot",
  "version": "1.0.0",
  "description": "Telegram bot for dog feeding coordination",
  "main": "dist/bot.js",
  "scripts": {
    "start": "ts-node src/bot.ts",
    "dev": "ts-node --watch src/bot.ts",
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "telegraf": "^4.15.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0"
  }
}
```

### 2. `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. `.env.example`
```env
# Telegram Bot Token (получить у @BotFather)
BOT_TOKEN=your_bot_token_here

# Режим разработки
NODE_ENV=development
```

### 4. `src/types.ts`
```typescript
export interface User {
  id: number;
  telegramId: number;
  username?: string;
  notificationsEnabled: boolean;
}

export interface Feeding {
  id: number;
  userId: number;
  timestamp: Date;
  foodType: 'dry' | 'wet';
  amount: number; // граммы
  details?: string;
}

export interface BotContext {
  users: Map<number, User>;
  feedings: Feeding[];
  nextFeedingId: number;
  nextUserId: number;
}
```

### 5. `src/bot.ts`
```typescript
import { Telegraf, Markup } from 'telegraf';
import * as dotenv from 'dotenv';
import { User, Feeding, BotContext } from './types';

// Загрузка переменных окружения
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN не найден в переменных окружения');
  process.exit(1);
}

// Создание бота
const bot = new Telegraf(BOT_TOKEN);

// Глобальное состояние (в памяти)
const botContext: BotContext = {
  users: new Map(),
  feedings: [],
  nextFeedingId: 1,
  nextUserId: 1
};

// Функция для получения или создания пользователя
function getOrCreateUser(telegramId: number, username?: string): User {
  let user = Array.from(botContext.users.values())
    .find(u => u.telegramId === telegramId);
  
  if (!user) {
    user = {
      id: botContext.nextUserId++,
      telegramId,
      username,
      notificationsEnabled: true
    };
    botContext.users.set(user.id, user);
    console.log(`Новый пользователь: ${username || telegramId}`);
  }
  
  return user;
}

// Функция для создания главной клавиатуры
function getMainKeyboard() {
  return Markup.keyboard([
    ['🍽️ Собачка поел']
  ]).resize();
}

// Команда /start
bot.start((ctx) => {
  const user = getOrCreateUser(
    ctx.from.id, 
    ctx.from.username || ctx.from.first_name
  );
  
  ctx.reply(
    `Привет, ${user.username || 'друг'}! 🐕\n\n` +
    'Этот бот поможет координировать кормление собаки.\n' +
    'Нажми кнопку ниже, когда покормишь собаку.',
    getMainKeyboard()
  );
});

// Обработка кнопки "Собачка поел"
bot.hears('🍽️ Собачка поел', (ctx) => {
  const user = getOrCreateUser(
    ctx.from.id,
    ctx.from.username || ctx.from.first_name
  );
  
  // Создание записи о кормлении
  const feeding: Feeding = {
    id: botContext.nextFeedingId++,
    userId: user.id,
    timestamp: new Date(),
    foodType: 'dry', // по умолчанию сухой корм
    amount: 12 // по умолчанию 12 граммов
  };
  
  botContext.feedings.push(feeding);
  
  // Уведомление всех пользователей
  const message = `🍽️ Собаку покормили!\n` +
    `Время: ${feeding.timestamp.toLocaleString('ru-RU')}\n` +
    `Кто: ${user.username || 'Пользователь'}`;
  
  // Отправка уведомления всем пользователям
  botContext.users.forEach(async (u) => {
    if (u.notificationsEnabled) {
      try {
        await ctx.telegram.sendMessage(u.telegramId, message);
      } catch (error) {
        console.error(`Ошибка отправки сообщения пользователю ${u.telegramId}:`, error);
      }
    }
  });
  
  console.log(`Кормление записано: ${user.username} в ${feeding.timestamp}`);
});

// Обработка неизвестных команд
bot.on('text', (ctx) => {
  ctx.reply(
    'Я не понимаю эту команду. Используй кнопки ниже.',
    getMainKeyboard()
  );
});

// Обработка ошибок
bot.catch((err, ctx) => {
  console.error('Ошибка бота:', err);
  ctx.reply('Произошла ошибка. Попробуй еще раз.');
});

// Запуск бота
console.log('Запуск бота...');
bot.launch();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('Бот запущен успешно!');
```

### 6. `README.md` (корневой)
```markdown
# Dog Feeding Bot - Этап 1

Базовый телеграм-бот для координации кормления собаки.

## Установка

1. Клонируй репозиторий
2. Установи зависимости: `npm install`
3. Создай файл `.env` на основе `.env.example`
4. Получи токен бота у @BotFather в Telegram
5. Добавь токен в `.env` файл

## Запуск

```bash
# Разработка (с автоперезагрузкой)
npm run dev

# Обычный запуск
npm start

# Сборка
npm run build
```

## Функциональность Этапа 1

- ✅ Подключение к Telegram Bot API
- ✅ Команда `/start` с приветствием
- ✅ Кнопка "Я покормил"
- ✅ Уведомление всех пользователей о кормлении
- ✅ Хранение данных в памяти
- ✅ Базовая обработка ошибок

## Тестирование

1. Запусти бота: `npm run dev`
2. Найди бота в Telegram по имени
3. Отправь команду `/start`
4. Нажми кнопку "🍽️ Собачка поел"
5. Проверь, что пришло уведомление

## Следующий этап

Этап 2: Добавление автоматических таймеров и напоминаний.
```

## Инструкции по тестированию

### Подготовка:
1. Создать бота через @BotFather
2. Получить токен
3. Установить зависимости: `npm install`
4. Создать `.env` файл с токеном

### Тестовые сценарии:
1. **Запуск бота**: `npm run dev` - должен запуститься без ошибок
2. **Команда /start**: Должно прийти приветствие с кнопкой
3. **Кнопка "Я покормил"**: Должно прийти уведомление о кормлении
4. **Многопользовательность**: Добавить второго пользователя, проверить уведомления
5. **Неизвестная команда**: Отправить произвольный текст - должен ответить с кнопкой

### Ожидаемые результаты:
- Бот отвечает на команды
- Кнопки работают корректно
- Уведомления приходят всем пользователям
- Данные сохраняются в памяти (до перезапуска)
- Нет критических ошибок в консоли

## Ограничения этапа
- Данные хранятся только в памяти
- Нет автоматических напоминаний
- Нет настроек
- Нет истории кормлений
- Простая обработка ошибок

## Переход к следующему этапу
После успешного тестирования можно переходить к Этапу 2: добавление таймеров и автоматических напоминаний.
