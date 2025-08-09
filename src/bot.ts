import { Telegraf, Scenes, session } from 'telegraf';
import * as dotenv from 'dotenv';
import { BotContext, BotState, DatabaseBotState } from './types';
import { TimerService } from './services/timer';
import { DatabaseService } from './services/database';
import {
    mainScene,
    setGlobalServices,
    setGlobalDatabaseForMain,
    getOrCreateUser,
} from './scenes/main';
import { setGlobalServicesForInterval } from './scenes/interval-settings';
import {
    otherActionsScene,
    setGlobalServicesForOtherActions,
} from './scenes/other-actions';
import {
    todayHistoryScene,
    setGlobalDatabaseForTodayHistory,
    setGlobalSchedulerForTodayHistory,
    setGlobalTimerForTodayHistory,
} from './scenes/today-history';
import { settingsScene } from './scenes/settings';
import { historyScene } from './scenes/history';
import { intervalSettingsScene } from './scenes/interval-settings';
import {
    foodSettingsScene,
    setGlobalDatabaseForFoodSettings,
} from './scenes/food-settings';
import {
    feedingDetailsScene,
    setGlobalDatabaseForFeedingDetails,
} from './scenes/feeding-details';
import {
    notificationSettingsScene,
    setGlobalDatabaseForNotificationSettings,
} from './scenes/notification-settings';
import { exportScene } from './scenes/export';
import {
    scheduleFeedingScene,
    setGlobalSchedulerForScheduleFeeding,
    setGlobalDatabaseForScheduleFeeding,
} from './scenes/schedule-feeding';
import {
    scheduledListScene,
    setGlobalSchedulerForScheduledList,
} from './scenes/scheduled-list';
import {
    fullHistoryScene,
    setGlobalSchedulerForFullHistory,
    setGlobalTimerForFullHistory,
} from './scenes/full-history';
import { SchedulerService } from './services/scheduler';
import { SCENES } from './utils/constants';
import { TimeParser } from './services/time-parser';
import { formatDateTime } from './utils/time-utils';
import { createUserLink } from './utils/user-utils';
import {
    getTimeOffsetInMinutes,
    getTimezoneByOffset,
} from './utils/timezone-utils';
import { AccessControlService } from './services/access-control';

// Загрузка переменных окружения
dotenv.config();

// Переменные для webhook
const NODE_ENV = process.env.NODE_ENV || 'development';
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = parseInt(process.env.PORT || '3000');
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || '/webhook';

console.log(`Запуск в режиме: ${NODE_ENV}`);

// Выбор токена бота в зависимости от окружения
let BOT_TOKEN: string;
if (NODE_ENV === 'production') {
    BOT_TOKEN = process.env.BOT_TOKEN_PROD || process.env.BOT_TOKEN || '';
    if (!BOT_TOKEN) {
        console.error(
            'BOT_TOKEN_PROD или BOT_TOKEN не найден в переменных окружения для продакшена'
        );
        process.exit(1);
    }
    console.log('Используется продакшеновый бот');
} else {
    BOT_TOKEN = process.env.BOT_TOKEN_DEV || process.env.BOT_TOKEN || '';
    if (!BOT_TOKEN) {
        console.error(
            'BOT_TOKEN_DEV или BOT_TOKEN не найден в переменных окружения для разработки'
        );
        process.exit(1);
    }
    console.log('Используется девелоперский бот');
}

// Создание бота
const bot = new Telegraf<BotContext>(BOT_TOKEN);

// Инициализация базы данных
const database = new DatabaseService();

// Глобальное состояние (для обратной совместимости)
const botState: BotState = {
    users: new Map(),
    feedings: [],
    nextFeedingId: 1,
    nextUserId: 1,
};

// Новое состояние с базой данных
const databaseBotState: DatabaseBotState = {
    database,
    defaultFeedingInterval: 210, // 3.5 часа
};

// Инициализация сервисов
const timerService = new TimerService(bot, database);
const schedulerService = new SchedulerService(database, timerService);
const accessControlService = new AccessControlService();

// Установка глобальных сервисов для сцен
setGlobalServices(timerService, database);
setGlobalServicesForInterval(timerService, database);
setGlobalDatabaseForMain(database);
setGlobalServicesForOtherActions(timerService, database, getOrCreateUser);
setGlobalDatabaseForTodayHistory(database);
setGlobalDatabaseForFoodSettings(database);
setGlobalDatabaseForFeedingDetails(database);
setGlobalDatabaseForNotificationSettings(database);
setGlobalSchedulerForScheduleFeeding(schedulerService);
setGlobalDatabaseForScheduleFeeding(database);
setGlobalSchedulerForScheduledList(schedulerService);
setGlobalSchedulerForTodayHistory(schedulerService);
setGlobalSchedulerForFullHistory(schedulerService);
setGlobalTimerForTodayHistory(timerService);
setGlobalTimerForFullHistory(timerService);
setGlobalTimerForTodayHistory(timerService);

// Настройка сцен
const stage = new Scenes.Stage<BotContext>([
    mainScene,
    feedingDetailsScene,
    settingsScene,
    historyScene,
    intervalSettingsScene,
    todayHistoryScene,
    foodSettingsScene,
    notificationSettingsScene,
    fullHistoryScene,
    exportScene,
    scheduleFeedingScene,
    scheduledListScene,
    otherActionsScene,
]);

// Команда для проверки статистики уведомлений (для администрирования)
bot.command('notifications', async ctx => {
    try {
        const notificationService = timerService.getNotificationService();
        const stats = await notificationService.getNotificationStats();

        let message =
            `📊 Статистика уведомлений:\n\n` +
            `👥 Всего пользователей: ${stats.totalUsers}\n\n`;

        // Пользователи с включенными уведомлениями
        message += `🔔 Уведомления включены: ${stats.enabledUsers}\n`;
        if (stats.enabledUsersList.length > 0) {
            message +=
                stats.enabledUsersList.map(name => `  • ${name}`).join('\n') +
                '\n';
        }
        message += '\n';

        // Пользователи с выключенными уведомлениями
        message += `🔕 Уведомления выключены: ${stats.disabledUsers}\n`;
        if (stats.disabledUsersList.length > 0) {
            message += stats.disabledUsersList
                .map(name => `  • ${name}`)
                .join('\n');
        }

        await ctx.reply(message);
    } catch (error) {
        console.error('Ошибка получения статистики уведомлений:', error);
        await ctx.reply('❌ Ошибка получения статистики');
    }
});

// Команда для проверки статистики планировщика (для администрирования)
bot.command('scheduler', async ctx => {
    try {
        const stats = await schedulerService.getSchedulerStats();

        let message =
            `📅 Статистика планировщика:\n\n` +
            `📊 Активных кормлений: ${stats.activeSchedules}\n` +
            `📈 Всего кормлений: ${stats.totalSchedules}\n` +
            `⏱️ Активных таймеров: ${stats.runningTimers}\n\n`;

        if (stats.nextSchedule) {
            message += `⏰ Следующее кормление:\n`;
            const user = await database.getUserById(
                stats.nextSchedule.createdBy
            );
            message += `  📅 ${formatDateTime(stats.nextSchedule.scheduledTime, user?.timezone)}\n`;
            message += `  🆔 ID: ${stats.nextSchedule.id}\n`;
            message += `  👤 Создал: ${createUserLink(user)}\n`;
        } else {
            message += `⏰ Нет запланированных кормлений`;
        }

        await ctx.reply(message);
    } catch (error) {
        console.error('Ошибка получения статистики планировщика:', error);
        await ctx.reply('❌ Ошибка получения статистики планировщика');
    }
});

// Команда для управления доступом (только для разрешенных пользователей)
bot.command('access', async ctx => {
    try {
        const userId = ctx.from?.id;
        if (!userId || !accessControlService.isUserAllowed(userId)) {
            await ctx.reply('🚫 У вас нет прав для выполнения этой команды');
            return;
        }

        const args = ctx.message.text.split(' ').slice(1);
        const command = args[0];
        const targetUserId = parseInt(args[1], 10);

        if (!command) {
            const allowedUsers = accessControlService.getAllowedUsers();
            let message = `🔐 Управление доступом:\n\n`;
            message += `👥 Разрешенных пользователей: ${accessControlService.getAllowedUsersCount()}\n\n`;
            
            if (allowedUsers.length > 0) {
                message += `📋 Список разрешенных ID:\n`;
                message += allowedUsers.map(id => `  • ${id}`).join('\n');
            }
            
            message += `\n\n📖 Команды:\n`;
            message += `• /access add <user_id> - добавить пользователя\n`;
            message += `• /access remove <user_id> - удалить пользователя\n`;
            message += `• /access reload - перезагрузить список из файла`;
            
            await ctx.reply(message);
            return;
        }

        switch (command) {
            case 'add':
                if (isNaN(targetUserId)) {
                    await ctx.reply('❌ Укажите корректный ID пользователя');
                    return;
                }
                accessControlService.addUser(targetUserId);
                await ctx.reply(`✅ Пользователь ${targetUserId} добавлен в список разрешенных`);
                break;

            case 'remove':
                if (isNaN(targetUserId)) {
                    await ctx.reply('❌ Укажите корректный ID пользователя');
                    return;
                }
                if (targetUserId === userId) {
                    await ctx.reply('❌ Нельзя удалить самого себя из списка разрешенных');
                    return;
                }
                accessControlService.removeUser(targetUserId);
                await ctx.reply(`✅ Пользователь ${targetUserId} удален из списка разрешенных`);
                break;

            case 'reload':
                accessControlService.reloadAllowedUsers();
                await ctx.reply(`✅ Список разрешенных пользователей перезагружен из файла`);
                break;

            default:
                await ctx.reply('❌ Неизвестная команда. Используйте: add, remove, reload');
        }
    } catch (error) {
        console.error('Ошибка в команде /access:', error);
        await ctx.reply('❌ Ошибка при выполнении команды');
    }
});

// Middleware для сессий и сцен
bot.use(session());
bot.use(stage.middleware());

// Middleware для проверки доступа пользователей
bot.use(async (ctx, next) => {
    // Проверяем доступ только для пользователей (не для каналов/групп)
    if (ctx.from && ctx.from.id) {
        const userId = ctx.from.id;
        
        if (!accessControlService.isUserAllowed(userId)) {
            console.log(`Доступ запрещен для пользователя ${userId} (${ctx.from.username || ctx.from.first_name})`);
            
            await ctx.reply(
                '🚫 Доступ запрещен\n\n' +
                'Этот бот доступен только для авторизованных пользователей.\n' +
                'Если вы считаете, что это ошибка, обратитесь к администратору.'
            );
            return; // Прерываем выполнение, не вызываем next()
        }
    }
    
    return next();
});

// Middleware для установки database в контексте
bot.use((ctx, next) => {
    ctx.database = database;
    return next();
});

// // Middleware для автоматического определения и сохранения часового пояса пользователя
// bot.use(async (ctx, next) => {
//     // Проверяем, что это текстовое сообщение и есть ctx.message.date
//     if (ctx.message && ctx.message.date && ctx.from && ctx.database) {
//         try {
//             // Получаем пользователя из базы данных
//             let dbUser = await ctx.database.getUserByTelegramId(ctx.from.id);

//             if (dbUser) {
//                 // Определяем разницу во времени
//                 const serverTime = new Date(); // Текущее время на сервере (UTC)
//                 const userTime = ctx.message.date; // Локальное время пользователя

//                 const offsetMinutes = getTimeOffsetInMinutes(
//                     serverTime,
//                     userTime
//                 );
//                 const timezone = getTimezoneByOffset(offsetMinutes);

//                 // Если удалось определить часовой пояс, сохраняем его
//                 if (timezone) {
//                     await ctx.database.updateUserTimezone(dbUser.id, timezone);
//                     console.log(
//                         `Автоматически определен и сохранен часовой пояс для пользователя ${dbUser.username || dbUser.telegramId}: ${timezone}`
//                     );
//                 }
//             }
//         } catch (error) {
//             console.error(
//                 'Ошибка при определении часового пояса пользователя:',
//                 error
//             );
//         }
//     }

//     return next();
// });

// Команды, которые используют сцены (должны быть ПОСЛЕ middleware)
// Команда /start - переход к главной сцене
bot.start(async ctx => {
    try {
        // Создаем или получаем пользователя из базы данных
        let dbUser = await database.getUserByTelegramId(ctx.from.id);
        if (!dbUser) {
            dbUser = await database.createUser(
                ctx.from.id,
                ctx.from.username || ctx.from.first_name
            );
            console.log(
                `Новый пользователь создан в БД: ${createUserLink(dbUser)}`
            );
        }

        console.log(
            `Пользователь ${dbUser.username || dbUser.telegramId} запустил бота`
        );
        ctx.scene.enter(SCENES.MAIN);
    } catch (error) {
        console.error('Ошибка при создании пользователя:', error);
        ctx.reply('Произошла ошибка при инициализации. Попробуйте позже.');
    }
});

// Команда для проверки статуса (обновленная для работы с БД)
bot.command('status', async ctx => {
    try {
        const nextFeeding = timerService.getNextFeedingInfo();
        const lastFeeding = await database.getLastFeeding();
        const nextScheduled = await schedulerService.getNextScheduledFeeding();

        let message = '📊 Статус кормления:\n\n';

        // Получаем пользователя для определения его часового пояса
        const dbUser = await database.getUserByTelegramId(ctx.from?.id || 0);

        if (lastFeeding) {
            message += `🍽️ Последнее кормление:\n`;
            message += `   Время: ${formatDateTime(lastFeeding.timestamp, dbUser?.timezone)}\n`;
            message += `   Кто: ${ctx.from?.username || 'Неизвестно'}\n\n`;
        } else {
            message += `🍽️ Кормлений еще не было\n\n`;
        }

        message += `⏰ Интервал кормления: ${TimeParser.formatInterval(nextFeeding.intervalMinutes)}\n\n`;

        if (nextFeeding.isActive && nextFeeding.time) {
            message += `⏰ Следующее кормление в ${formatDateTime(nextFeeding.time, dbUser?.timezone)}\n`;
        } else {
            message += '⏹️ Кормления приостановлены\n';
        }

        // Добавляем информацию о запланированных кормлениях
        if (nextScheduled) {
            message += `\n📅 Запланированное кормление:\n`;
            const scheduleUser = await database.getUserById(
                nextScheduled.createdBy
            );
            message += `   Время: ${formatDateTime(nextScheduled.scheduledTime, scheduleUser?.timezone)}\n`;
            message += `   ID: ${nextScheduled.id}\n`;
            message += `   Создал: ${createUserLink(scheduleUser)}\n`;
        }

        // Добавляем статистику из БД
        const stats = await database.getStats();
        message += `\n📊 Статистика:\n`;
        message += `• Сегодня: ${stats.todayFeedings} кормлений\n`;
        message += `• Всего: ${stats.totalFeedings} кормлений`;

        ctx.reply(message);
    } catch (error) {
        console.error('Ошибка в команде /status:', error);
        ctx.reply('Ошибка при получении статуса. Попробуйте позже.');
    }
});

// Команда для возврата на главный экран
bot.command('home', ctx => {
    ctx.scene.enter(SCENES.MAIN);
});

// Обработка ошибок
bot.catch((err, ctx) => {
    console.error('Ошибка бота:', err);
    ctx.reply('Произошла ошибка. Попробуйте еще раз или используйте /start');
});

// Graceful shutdown
process.once('SIGINT', async () => {
    console.log('Получен сигнал SIGINT, остановка бота...');
    timerService.stopAllTimers();
    schedulerService.cleanup();
    await database.close();
    bot.stop('SIGINT');
});

process.once('SIGTERM', async () => {
    console.log('Получен сигнал SIGTERM, остановка бота...');
    timerService.stopAllTimers();
    schedulerService.cleanup();
    await database.close();
    bot.stop('SIGTERM');
});

// Инициализация и запуск бота
async function startBot() {
    try {
        console.log('Инициализация базы данных...');
        await database.initialize();

        console.log('Инициализация планировщика...');
        await schedulerService.initialize();

        console.log('Запуск бота...');

        // Выбор режима запуска в зависимости от окружения
        if (NODE_ENV === 'production') {
            // Режим webhook для продакшена
            if (!WEBHOOK_URL) {
                throw new Error('WEBHOOK_URL обязателен для продакшена');
            }

            console.log(`Запуск в режиме webhook:`);
            console.log(`  URL: ${WEBHOOK_URL}${WEBHOOK_PATH}`);
            console.log(`  Port: ${PORT}`);

            // Проверяем текущий статус webhook
            try {
                const webhookInfo = await bot.telegram.getWebhookInfo();
                const targetUrl = `${WEBHOOK_URL}${WEBHOOK_PATH}`;

                if (webhookInfo.url === targetUrl) {
                    console.log('Webhook уже установлен на правильный URL');
                } else {
                    console.log('Установка webhook...');
                    await bot.telegram.setWebhook(targetUrl);
                    console.log('Webhook установлен успешно');
                }
            } catch (webhookError: any) {
                if (webhookError.response?.error_code === 429) {
                    console.log(
                        'Rate limit при установке webhook. Продолжаем с текущими настройками...'
                    );
                    const retryAfter =
                        webhookError.response?.parameters?.retry_after || 10;
                    console.log(
                        `Повторная попытка через ${retryAfter} секунд...`
                    );

                    // Ждем и пытаемся снова
                    await new Promise(resolve =>
                        setTimeout(resolve, retryAfter * 1000)
                    );
                    try {
                        await bot.telegram.setWebhook(
                            `${WEBHOOK_URL}${WEBHOOK_PATH}`
                        );
                        console.log('Webhook установлен после ожидания');
                    } catch (retryError) {
                        console.log(
                            'Не удалось установить webhook, но продолжаем запуск...'
                        );
                    }
                } else {
                    console.error('Ошибка установки webhook:', webhookError);
                    throw webhookError;
                }
            }

            // Запуск в режиме webhook
            await bot.launch({
                webhook: {
                    domain: WEBHOOK_URL,
                    path: WEBHOOK_PATH,
                    port: PORT,
                },
            });

            console.log('Бот запущен в режиме webhook!');
        } else {
            // Режим polling для разработки
            console.log('Запуск в режиме polling (разработка)...');

            // ВАЖНО: НЕ удаляем webhook в development, чтобы не повлиять на продакшеновый бот
            // Если используется отдельный dev бот, то webhook у него скорее всего не установлен
            // Если же используется тот же бот, то удаление webhook сломает продакшен
            console.log(
                'Webhook не удаляется для безопасности продакшенового бота'
            );

            // Запуск в режиме polling
            await bot.launch();

            console.log('Бот запущен в режиме polling!');
        }
    } catch (error) {
        console.error('Ошибка при запуске бота:', error);
        process.exit(1);
    }
}

startBot();
