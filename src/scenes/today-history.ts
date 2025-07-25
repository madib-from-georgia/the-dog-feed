import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../types';
import { SCENES } from '../utils/constants';
import { DatabaseService, DatabaseFeeding, DatabaseUser } from '../services/database';
import { ScheduledFeeding } from '../services/scheduler';
import { TimerService } from '../services/timer';
import { toMoscowTime } from '../utils/time-utils';

export const todayHistoryScene = new Scenes.BaseScene<BotContext>(SCENES.TODAY_HISTORY);

// Глобальные переменные для доступа к сервисам
let globalDatabase: DatabaseService | null = null;
let globalSchedulerService: any = null;
let globalTimerService: TimerService | null = null;

// Функция для установки глобальной базы данных
export function setGlobalDatabaseForTodayHistory(database: DatabaseService) {
  globalDatabase = database;
}

// Функция для установки глобального сервиса планировщика
export function setGlobalSchedulerForTodayHistory(schedulerService: any) {
  globalSchedulerService = schedulerService;
}

// Функция для установки глобального сервиса таймера
export function setGlobalTimerForTodayHistory(timerService: TimerService) {
  globalTimerService = timerService;
}

// Вход в сцену истории за сегодня
todayHistoryScene.enter(async (ctx) => {
  try {
    if (!globalDatabase) {
      ctx.reply('Ошибка: база данных не инициализирована. Попробуйте перезапустить бота командой /start');
      return;
    }

    // Получаем кормления за сегодня
    const todayFeedings = await globalDatabase.getTodayFeedings();
    const allUsers = await globalDatabase.getAllUsers();
    
    // Создаем карту пользователей для быстрого поиска
    const usersMap = new Map<number, DatabaseUser>();
    allUsers.forEach(user => usersMap.set(user.id, user));

    let message = '📅 История кормлений за сегодня\n\n';

    if (todayFeedings.length === 0) {
      message += '🍽️ Сегодня кормлений еще не было\n\n';
      message += 'Нажмите "🍽️ Я покормил" на главном экране, чтобы записать кормление.';
    } else {
      message += `📊 Всего кормлений: ${todayFeedings.length}\n\n`;
      
      // Группируем кормления по времени
      todayFeedings.forEach((feeding, index) => {
        const user = usersMap.get(feeding.userId);
        const timeStr = toMoscowTime(feeding.timestamp).toLocaleString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        message += `${index + 1}. 🕐 ${timeStr}\n`;
        message += `   👤 ${user?.username || 'Неизвестный пользователь'}\n`;
        message += `   🍽️ ${feeding.foodType} корм, ${feeding.amount}г\n`;
        
        // Добавляем детали кормления, если они есть
        if (feeding.details) {
          message += `   📝 ${feeding.details}\n`;
        }
        
        if (index < todayFeedings.length - 1) {
          message += '\n';
        }
      });

      // Добавляем статистику
      const totalAmount = todayFeedings.reduce((sum, feeding) => sum + feeding.amount, 0);
      message += `\n📈 Общий объем: ${totalAmount}г`;
      
      // Показываем интервалы между кормлениями
      if (todayFeedings.length > 1) {
        const intervals: string[] = [];
        for (let i = 1; i < todayFeedings.length; i++) {
          const prevTime = todayFeedings[i].timestamp.getTime();
          const currentTime = todayFeedings[i - 1].timestamp.getTime();
          const diffMinutes = Math.round((currentTime - prevTime) / (1000 * 60));
          
          if (diffMinutes < 60) {
            intervals.push(`${diffMinutes} мин`);
          } else {
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;
            if (minutes === 0) {
              intervals.push(`${hours} ч`);
            } else {
              intervals.push(`${hours} ч ${minutes} мин`);
            }
          }
        }
        
        if (intervals.length > 0) {
          message += `\n⏱️ Интервалы: ${intervals.join(', ')}`;
        }
      }
    }

    // Получаем запланированные кормления
    if (globalSchedulerService) {
      try {
        const scheduledFeedings: ScheduledFeeding[] = await globalSchedulerService.getActiveScheduledFeedings();
        const now = new Date();
        
        // Фильтруем только будущие кормления
        const futureFeedings: ScheduledFeeding[] = scheduledFeedings.filter((schedule: ScheduledFeeding) =>
          schedule.scheduledTime > now
        );
        
        if (futureFeedings.length > 0) {
          message += `\n\n📅 Следующие запланированные кормления:\n`;
          
          // Сортируем по времени
          futureFeedings.sort((a: ScheduledFeeding, b: ScheduledFeeding) =>
            a.scheduledTime.getTime() - b.scheduledTime.getTime()
          );
          
          // Показываем максимум 3 ближайших кормления
          const displayFeedings = futureFeedings.slice(0, 3);
          
          for (const schedule of displayFeedings) {
            const user = usersMap.get(schedule.createdBy);
            const username = user?.username || 'Неизвестно';
            
            const scheduledTime = schedule.scheduledTime.toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });
            
            // Рассчитываем время до кормления
            const timeUntil = schedule.scheduledTime.getTime() - now.getTime();
            const hours = Math.floor(timeUntil / (1000 * 60 * 60));
            const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
            
            let timeUntilText = '';
            if (hours > 0) {
              timeUntilText = `через ${hours} ч ${minutes} мин`;
            } else {
              timeUntilText = `через ${minutes} мин`;
            }
            
            message += `⏰ ${scheduledTime} (${timeUntilText}) - ${username}\n`;
          }
          
          if (futureFeedings.length > 3) {
            message += `... и еще ${futureFeedings.length - 3} кормлений\n`;
          }
        }
      } catch (error) {
        console.error('Ошибка при получении запланированных кормлений:', error);
      }
    }
    
    // Получаем информацию о следующем автоматическом кормлении
    if (globalTimerService) {
      try {
        const nextFeedingInfo = globalTimerService.getNextFeedingInfo();
        if (nextFeedingInfo.isActive && nextFeedingInfo.time) {
          const now = new Date();
          const timeUntil = nextFeedingInfo.time.getTime() - now.getTime();
          
          if (timeUntil > 0) {
            const hours = Math.floor(timeUntil / (1000 * 60 * 60));
            const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
            
            let timeUntilText = '';
            if (hours > 0) {
              timeUntilText = `через ${hours} ч ${minutes} мин`;
            } else {
              timeUntilText = `через ${minutes} мин`;
            }
            
            message += `\n\n⏰ Следующее автоматическое кормление:\n`;
            message += `   ${nextFeedingInfo.time.toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })} (${timeUntilText})`;
          }
        }
      } catch (error) {
        console.error('Ошибка при получении информации о следующем автоматическом кормлении:', error);
      }
    }
    
    // Получаем статистику
    const stats = await globalDatabase.getStats();
    message += `\n\n📊 Общая статистика:\n`;
    message += `• Всего кормлений: ${stats.totalFeedings}\n`;
    message += `• Пользователей: ${stats.totalUsers}`;

    ctx.reply(message, Markup.keyboard([
      ['🔄 Обновить', '📋 Вся история'],
      ['🏠 Главный экран']
    ]).resize());

  } catch (error) {
    console.error('Ошибка при получении истории за сегодня:', error);
    ctx.reply(
      'Произошла ошибка при загрузке истории кормлений. Попробуйте позже.',
      Markup.keyboard([
        ['🏠 Главный экран']
      ]).resize()
    );
  }
});

// Обработка кнопки "Обновить"
todayHistoryScene.hears(/🔄 Обновить/, async (ctx) => {
  // Просто перезаходим в сцену для обновления данных
  await ctx.scene.reenter();
});

// Обработка кнопки "Вся история"
todayHistoryScene.hears(/📋 Вся история/, (ctx) => {
  ctx.scene.enter(SCENES.HISTORY);
});

// Обработка кнопки "Главный экран"
todayHistoryScene.hears(/🏠 Главный экран/, (ctx) => {
  ctx.scene.enter(SCENES.MAIN);
});

// Обработка команды /home
todayHistoryScene.command('home', (ctx) => {
  ctx.scene.enter(SCENES.MAIN);
});

// Обработка команды /status
todayHistoryScene.command('status', async (ctx) => {
  try {
    if (!globalDatabase) {
      ctx.reply('Ошибка: база данных не инициализирована.');
      return;
    }

    const lastFeeding = await globalDatabase.getLastFeeding();
    const stats = await globalDatabase.getStats();
    
    let message = '📊 Статус кормления:\n\n';
    
    if (lastFeeding) {
      const lastUser = await globalDatabase.getUserByTelegramId(ctx.from?.id || 0);
      message += `🍽️ Последнее кормление:\n`;
      message += `   Время: ${toMoscowTime(lastFeeding.timestamp).toLocaleString('ru-RU')}\n`;
      message += `   Кто: ${lastUser?.username || 'Неизвестно'}\n\n`;
    } else {
      message += `🍽️ Кормлений еще не было\n\n`;
    }
    
    message += `📊 Статистика:\n`;
    message += `• Сегодня: ${stats.todayFeedings} кормлений\n`;
    message += `• Всего: ${stats.totalFeedings} кормлений\n`;
    message += `• Пользователей: ${stats.totalUsers}`;
    
    ctx.reply(message);
  } catch (error) {
    console.error('Ошибка в команде /status:', error);
    ctx.reply('Ошибка при получении статуса. Попробуйте позже.');
  }
});

// Обработка неизвестных команд (но не команд, начинающихся с /)
todayHistoryScene.on('text', (ctx) => {
  const text = ctx.message.text;
  // Пропускаем команды, начинающиеся с /
  if (text.startsWith('/')) {
    return;
  }
  
  ctx.reply(
    'Я не понимаю эту команду. Используйте кнопки меню.',
    Markup.keyboard([
      ['🔄 Обновить', '📋 Вся история'],
      ['🏠 Главный экран']
    ]).resize()
  );
});
