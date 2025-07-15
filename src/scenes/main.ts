import { Scenes, Markup } from 'telegraf';
import { BotContext, User, Feeding } from '../types';
import { DatabaseService } from '../services/database';
import { getMainKeyboard } from '../utils/keyboards';
import { MESSAGES, SCENES } from '../utils/constants';

export const mainScene = new Scenes.BaseScene<BotContext>(SCENES.MAIN);

// Глобальные переменные для доступа к сервисам (будут установлены из bot.ts)
let globalTimerService: any = null;
let globalDatabase: DatabaseService | null = null;

// Функция для установки глобальных сервисов
export function setGlobalServices(timerService: any, database: any) {
  globalTimerService = timerService;
  globalDatabase = database;
}

// Функция для установки глобальной базы данных
export function setGlobalDatabaseForMain(database: DatabaseService) {
  globalDatabase = database;
}

// Функция для получения или создания пользователя
async function getOrCreateUser(telegramId: number, username?: string): Promise<User> {
  if (!globalDatabase) {
    throw new Error('Database не инициализирована');
  }
  
  let user = await globalDatabase.getUserByTelegramId(telegramId);

  if (!user) {
    user = await globalDatabase.createUser(telegramId, username);
    console.log(`Новый пользователь: ${username || telegramId}`);
  }

  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    notificationsEnabled: user.notificationsEnabled
  };
}

// Вход в главную сцену
mainScene.enter((ctx) => {
  ctx.reply(MESSAGES.WELCOME, getMainKeyboard());
});

// Обработка кнопки "Я покормил"
mainScene.hears(/🍽️ Я покормил/, async (ctx) => {
  try {
    if (!globalTimerService || !globalDatabase) {
      ctx.reply('Ошибка: сервисы не инициализированы. Попробуйте перезапустить бота командой /start');
      return;
    }

    // Получаем или создаем пользователя в базе данных
    let dbUser = await globalDatabase.getUserByTelegramId(ctx.from!.id);
    if (!dbUser) {
      dbUser = await globalDatabase.createUser(
        ctx.from!.id,
        ctx.from!.username || ctx.from!.first_name
      );
    }

    // Также создаем пользователя в старом формате для совместимости с таймерами
    const user = await getOrCreateUser(
      ctx.from!.id,
      ctx.from!.username || ctx.from!.first_name
    );

    // Получаем текущие настройки корма из БД
    const foodType = await globalDatabase.getSetting('default_food_type') || 'dry';
    const foodAmount = parseInt(await globalDatabase.getSetting('default_food_amount') || '12');

    // Создание записи о кормлении в базе данных с текущими настройками
    const dbFeeding = await globalDatabase.createFeeding(dbUser.id, foodType, foodAmount);

    // Сохраняем ID кормления в сессии для возможности уточнения деталей
    if (!ctx.session) {
      ctx.session = {};
    }
    ctx.session.lastFeedingId = dbFeeding.id;

    // Создаем запись в старом формате для совместимости с таймерами
    const feeding: Feeding = {
      id: dbFeeding.id,
      userId: user.id,
      timestamp: dbFeeding.timestamp,
      foodType: dbFeeding.foodType,
      amount: dbFeeding.amount
    };

    // Запуск таймера на следующее кормление
    globalTimerService.startFeedingTimer();

    // Получение информации о следующем кормлении
    const nextFeedingInfo = globalTimerService.getNextFeedingInfo();
    
    // Форматирование интервала
    const intervalMinutes = nextFeedingInfo.intervalMinutes;
    let intervalText = '';
    if (intervalMinutes < 60) {
      intervalText = `${intervalMinutes} мин`;
    } else {
      const hours = Math.floor(intervalMinutes / 60);
      const remainingMinutes = intervalMinutes % 60;
      if (remainingMinutes === 0) {
        intervalText = `${hours} ч`;
      } else {
        intervalText = `${hours} ч ${remainingMinutes} мин`;
      }
    }

    // Форматирование информации о корме
    const foodInfo = `${foodAmount}г ${foodType === 'dry' ? 'сухого' : 'влажного'} корма`;

    // Уведомление всех пользователей
    const message = `${MESSAGES.FEEDING_COMPLETED}\n` +
      `Время: ${dbFeeding.timestamp.toLocaleString('ru-RU')}\n` +
      `Кто: ${dbUser.username || 'Пользователь'}\n` +
      `Корм: ${foodInfo}\n\n` +
      `⏰ Следующее кормление через ${intervalText}`;

    // Получаем всех пользователей из базы данных для уведомлений
    const allUsers = await globalDatabase.getAllUsers();
    for (const u of allUsers) {
      if (u.notificationsEnabled) {
        try {
          await ctx.telegram.sendMessage(u.telegramId, message);
        } catch (error) {
          console.error(`Ошибка отправки сообщения пользователю ${u.telegramId}:`, error);
        }
      }
    }

    console.log(`Кормление записано в БД: ${dbUser.username} в ${dbFeeding.timestamp}`);

    // Переход к сцене успешного кормления
    await ctx.scene.enter(SCENES.FEEDING_SUCCESS);
  } catch (error) {
    console.error('Ошибка при обработке кормления:', error);
    ctx.reply('Произошла ошибка при записи кормления. Попробуйте еще раз.');
  }
});

// Обработка кнопки "Завершить кормления на сегодня"
mainScene.hears(/⏹️ Завершить кормления на сегодня/, async (ctx) => {
  try {
    if (!globalTimerService || !globalDatabase) {
      ctx.reply('Ошибка: сервисы не инициализированы. Попробуйте перезапустить бота командой /start');
      return;
    }

    const user = await getOrCreateUser(
      ctx.from!.id,
      ctx.from!.username || ctx.from!.first_name
    );

    globalTimerService.stopAllTimers();

    const message = `${MESSAGES.FEEDINGS_STOPPED}\n` +
      `Инициатор: ${user.username || 'Пользователь'}\n\n` +
      `Чтобы возобновить кормления, нажмите "🍽️ Я покормил"`;

    // Уведомление всех пользователей через базу данных
    const allUsers = await globalDatabase.getAllUsers();
    for (const u of allUsers) {
      if (u.notificationsEnabled) {
        try {
          await ctx.telegram.sendMessage(u.telegramId, message);
        } catch (error) {
          console.error(`Ошибка отправки сообщения пользователю ${u.telegramId}:`, error);
        }
      }
    }

    console.log(`Кормления остановлены пользователем: ${user.username}`);
    
    // Остаемся на главном экране
    ctx.reply('Возвращаемся на главный экран', getMainKeyboard());
  } catch (error) {
    console.error('Ошибка при остановке кормлений:', error);
    ctx.reply('Произошла ошибка при остановке кормлений. Попробуйте еще раз.');
  }
});

// Обработка кнопки "Настройки"
mainScene.hears(/⚙️ Настройки/, (ctx) => {
  ctx.scene.enter(SCENES.SETTINGS);
});

// Обработка кнопки "Управление расписанием"
mainScene.hears(/📅 Управление расписанием/, (ctx) => {
  // Создаем сцену управления расписанием с кнопками
  ctx.reply(
    '📅 Управление расписанием кормлений\n\n' +
    'Выберите действие:',
    Markup.keyboard([
      ['📅 Создать кормление на время'],
      ['📋 Просмотреть запланированные'],
      ['❌ Отменить все запланированные'],
      ['🏠 Выйти на главный экран']
    ]).resize()
  );
});

// Обработка подкнопок управления расписанием
mainScene.hears(/📅 Создать кормление на время/, (ctx) => {
  ctx.scene.enter(SCENES.SCHEDULE_FEEDING);
});

mainScene.hears(/📋 Просмотреть запланированные/, (ctx) => {
  ctx.scene.enter(SCENES.SCHEDULED_LIST);
});

mainScene.hears(/❌ Отменить все запланированные/, async (ctx) => {
  // Это будет обработано в новой сцене, но добавим простую проверку
  ctx.scene.enter(SCENES.SCHEDULED_LIST);
});

// Обработка кнопки "История кормлений"
mainScene.hears(/📋 История кормлений/, (ctx) => {
  ctx.scene.enter(SCENES.HISTORY);
});

// Обработка команды /status
mainScene.command('status', async (ctx) => {
  try {
    if (!globalTimerService || !globalDatabase) {
      ctx.reply('Ошибка: сервисы не инициализированы. Попробуйте перезапустить бота командой /start');
      return;
    }

    const nextFeeding = globalTimerService.getNextFeedingInfo();
    const lastFeeding = await globalDatabase.getLastFeeding();
    const stats = await globalDatabase.getStats();
    
    let message = '📊 Статус кормления:\n\n';
    
    if (lastFeeding) {
      const lastUser = await globalDatabase.getUserById(lastFeeding.userId);
      message += `🍽️ Последнее кормление:\n`;
      message += `   Время: ${lastFeeding.timestamp.toLocaleString('ru-RU')}\n`;
      message += `   Кто: ${lastUser?.username || 'Неизвестно'}\n\n`;
    } else {
      message += `🍽️ Кормлений еще не было\n\n`;
    }
    
    // Простое форматирование интервала
    const intervalMinutes = nextFeeding.intervalMinutes;
    let intervalText = '';
    if (intervalMinutes < 60) {
      intervalText = `${intervalMinutes} мин`;
    } else {
      const hours = Math.floor(intervalMinutes / 60);
      const remainingMinutes = intervalMinutes % 60;
      if (remainingMinutes === 0) {
        intervalText = `${hours} ч`;
      } else {
        intervalText = `${hours} ч ${remainingMinutes} мин`;
      }
    }
    
    message += `⏰ Интервал кормления: ${intervalText}\n\n`;
    
    if (nextFeeding.isActive && nextFeeding.time) {
      message += `⏰ Следующее кормление: ${nextFeeding.time.toLocaleString('ru-RU')}\n\n`;
    } else {
      message += '⏹️ Кормления приостановлены\n\n';
    }
    
    // Добавляем статистику из базы данных
    message += `📊 Статистика:\n`;
    message += `   👥 Пользователей: ${stats.totalUsers}\n`;
    message += `   🍽️ Кормлений сегодня: ${stats.todayFeedings}\n`;
    message += `   📈 Всего кормлений: ${stats.totalFeedings}`;
    
    ctx.reply(message);
  } catch (error) {
    console.error('Ошибка в команде /status:', error);
    ctx.reply('Ошибка при получении статуса. Попробуйте позже.');
  }
});

// Обработка команды /home
mainScene.command('home', (ctx) => {
  ctx.reply(MESSAGES.WELCOME, getMainKeyboard());
});

// Обработка неизвестных команд (но не команд, начинающихся с /)
mainScene.on('text', (ctx) => {
  const text = ctx.message.text;
  // Пропускаем команды, начинающиеся с /
  if (text.startsWith('/')) {
    return;
  }
  ctx.reply(MESSAGES.UNKNOWN_COMMAND, getMainKeyboard());
});


