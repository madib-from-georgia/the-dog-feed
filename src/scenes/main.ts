import { Scenes, Markup } from 'telegraf';
import { BotContext, User, Feeding } from '../types';
import { DatabaseService } from '../services/database';
import { getMainKeyboard } from '../utils/keyboards';
import { MESSAGES, SCENES } from '../utils/constants';
import { formatDateTime } from '../utils/time-utils';
import { createUserLink } from '../utils/user-utils';

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
async function getOrCreateUser(
    telegramId: number,
    username?: string
): Promise<User> {
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
        notificationsEnabled: user.notificationsEnabled,
    };
}

// Вход в главную сцену
mainScene.enter(ctx => {
    // Проверяем, нужно ли показывать кнопку "Уточнить детали кормления"
    const showFeedingDetailsButton = ctx.session?.justFed === true;

    // Очищаем флаг, чтобы кнопка не показывалась при следующих входах
    if (ctx.session) {
        ctx.session.justFed = false;
    }

    // Проверяем, был ли это первый вход (через /start)
    if (!ctx.session?.firstVisitDone) {
        // Первый вход - показываем приветственное сообщение
        if (ctx.session) {
            ctx.session.firstVisitDone = true;
        }
        ctx.reply(MESSAGES.WELCOME, getMainKeyboard(showFeedingDetailsButton));
    } else {
        // Последующие переходы - показываем другое сообщение
        ctx.reply(
            'Возвращаемся на главный экран',
            getMainKeyboard(showFeedingDetailsButton)
        );
    }
});

// Обработка кнопки "Другие действия"
mainScene.hears(/Другие действия/, ctx => {
    ctx.scene.enter(SCENES.OTHER_ACTIONS);
});

// Обработка кнопки "Когда следующее кормление?"
mainScene.hears(/Когда следующее кормление\?/, async ctx => {
    try {
        if (!globalTimerService) {
            ctx.reply(
                'Ошибка: сервис таймера не инициализирован. Попробуйте перезапустить бота командой /start'
            );
            return;
        }

        const nextFeedingInfo = globalTimerService.getNextFeedingInfo();

        if (!nextFeedingInfo.isActive || !nextFeedingInfo.time) {
            ctx.reply(
                '⏹️ Кормления приостановлены.\nЧтобы возобновить, нажмите "🍽️ Собачка поел"'
            );
            return;
        }

        // Проверяем, что globalDatabase инициализирована
        if (!globalDatabase) {
            ctx.reply(
                'Ошибка: база данных не инициализирована. Попробуйте перезапустить бота командой /start'
            );
            return;
        }

        // Получаем текущего пользователя для определения его часового пояса
        const currentUser = await globalDatabase.getUserByTelegramId(
            ctx.from!.id
        );

        // Форматирование времени следующего кормления с учетом часового пояса пользователя
        const nextFeedingTime = nextFeedingInfo.time;
        const timeString = currentUser
            ? formatDateTime(nextFeedingTime, currentUser.timezone).split(
                  ' в '
              )[1]
            : nextFeedingTime.getHours().toString().padStart(2, '0') +
              ':' +
              nextFeedingTime.getMinutes().toString().padStart(2, '0');

        // Вычисление времени до следующего кормления
        const now = new Date();
        const timeDiff = nextFeedingTime.getTime() - now.getTime();
        const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutesDiff = Math.floor(
            (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
        );

        let timeDiffString = '';
        if (hoursDiff > 0) {
            timeDiffString = `${hoursDiff} ч ${minutesDiff} мин`;
        } else {
            timeDiffString = `${minutesDiff} мин`;
        }

        ctx.reply(
            `⏰ Следующее кормление в ${timeString} (через ${timeDiffString})`
        );
    } catch (error) {
        console.error(
            'Ошибка при получении времени следующего кормления:',
            error
        );
        ctx.reply(
            'Произошла ошибка при получении времени следующего кормления. Попробуйте еще раз.'
        );
    }
});

// Обработка кнопки "Собачка поел"
mainScene.hears(/🍽️ Собачка поел/, async ctx => {
    try {
        if (!globalTimerService || !globalDatabase) {
            ctx.reply(
                'Ошибка: сервисы не инициализированы. Попробуйте перезапустить бота командой /start'
            );
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
        const foodType =
            (await globalDatabase.getSetting('default_food_type')) || 'dry';
        const foodAmount = parseInt(
            (await globalDatabase.getSetting('default_food_amount')) || '12'
        );

        // Создание записи о кормлении в базе данных с текущими настройками
        const dbFeeding = await globalDatabase.createFeeding(
            dbUser.id,
            foodType,
            foodAmount
        );

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
            amount: dbFeeding.amount,
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
        const message =
            `🍽️ Собачка вкусно поел!\n\n` +
            `${formatDateTime(dbFeeding.timestamp, dbUser?.timezone).replace(', ', ' в ')}\n` +
            `${createUserLink(dbUser)} дал ${foodInfo}\n\n` +
            `⏰ Следующее кормление в ${nextFeedingInfo.time ? formatDateTime(nextFeedingInfo.time, dbUser?.timezone).split(' в ')[1] : 'неизвестно'} (через ${intervalText})`;

        // Получаем всех пользователей из базы данных для уведомлений
        const allUsers = await globalDatabase.getAllUsers();
        for (const u of allUsers) {
            // Пропускаем текущего пользователя, так как ему будет отправлено отдельное сообщение
            if (u.telegramId === ctx.from!.id) {
                continue;
            }

            if (u.notificationsEnabled) {
                try {
                    await ctx.telegram.sendMessage(u.telegramId, message);
                } catch (error) {
                    console.error(
                        `Ошибка отправки сообщения пользователю ${u.telegramId}:`,
                        error
                    );
                }
            }
        }

        console.log(
            `Кормление записано в БД: ${dbUser.username} в ${dbFeeding.timestamp}`
        );

        // Показываем сообщение об успешном кормлении и обновляем клавиатуру
        await ctx.reply(message, getMainKeyboard(true));
    } catch (error) {
        console.error('Ошибка при обработке кормления:', error);
        ctx.reply('Произошла ошибка при записи кормления. Попробуйте еще раз.');
    }
});

// Обработка кнопки "Завершить кормления на сегодня"
mainScene.hears(/⏹️ Завершить кормления на сегодня/, async ctx => {
    try {
        if (!globalTimerService || !globalDatabase) {
            ctx.reply(
                'Ошибка: сервисы не инициализированы. Попробуйте перезапустить бота командой /start'
            );
            return;
        }

        const user = await getOrCreateUser(
            ctx.from!.id,
            ctx.from!.username || ctx.from!.first_name
        );

        globalTimerService.stopAllTimers();

        // Создаем объект, соответствующий интерфейсу DatabaseUser
        const dbUser = {
            id: user.id,
            telegramId: user.telegramId,
            username: user.username,
            notificationsEnabled: user.notificationsEnabled,
            feedingInterval: user.feedingInterval || 210, // Значение по умолчанию
            createdAt: new Date(),
        };

        const message =
            `${MESSAGES.FEEDINGS_STOPPED}\n` +
            `Инициатор: ${createUserLink(dbUser)}\n\n` +
            `Чтобы возобновить кормления, нажмите "🍽️ Собачка поел"`;

        // Уведомление всех пользователей через базу данных
        const allUsers = await globalDatabase.getAllUsers();
        for (const u of allUsers) {
            if (u.notificationsEnabled) {
                try {
                    await ctx.telegram.sendMessage(u.telegramId, message);
                } catch (error) {
                    console.error(
                        `Ошибка отправки сообщения пользователю ${u.telegramId}:`,
                        error
                    );
                }
            }
        }

        console.log(`Кормления остановлены пользователем: ${user.username}`);

        // Остаемся на главном экране
        ctx.reply('Возвращаемся на главный экран', getMainKeyboard());
    } catch (error) {
        console.error('Ошибка при остановке кормлений:', error);
        ctx.reply(
            'Произошла ошибка при остановке кормлений. Попробуйте еще раз.'
        );
    }
});

// Обработка команды /status
mainScene.command('status', async ctx => {
    try {
        if (!globalTimerService || !globalDatabase) {
            ctx.reply(
                'Ошибка: сервисы не инициализированы. Попробуйте перезапустить бота командой /start'
            );
            return;
        }

        const nextFeeding = globalTimerService.getNextFeedingInfo();
        const lastFeeding = await globalDatabase.getLastFeeding();
        const stats = await globalDatabase.getStats();

        // Получаем текущего пользователя
        const currentUser = await globalDatabase.getUserByTelegramId(
            ctx.from!.id
        );

        let message = '📊 Статус кормления:\n\n';

        if (lastFeeding) {
            const lastUser = await globalDatabase.getUserById(
                lastFeeding.userId
            );
            const username = createUserLink(lastUser);
            message += `🍽️ Последнее кормление:\n`;
            message += `   Время: ${formatDateTime(lastFeeding.timestamp, lastUser?.timezone)}\n`;
            message += `   Кто: ${username}\n\n`;
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
            message += `⏰ Следующее кормление в ${formatDateTime(nextFeeding.time, currentUser?.timezone)}\n\n`;
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
mainScene.command('home', ctx => {
    ctx.reply('Возвращаемся на главный экран', getMainKeyboard());
});

// Обработка кнопки "Уточнить детали кормления"
mainScene.hears(/📝 Уточнить детали кормления/, ctx => {
    ctx.scene.enter(SCENES.FEEDING_DETAILS);
});

// Обработка кнопки "На главную"
mainScene.hears(/🏠 На главную/, ctx => {
    ctx.scene.enter(SCENES.MAIN);
});

// Обработка неизвестных команд (но не команд, начинающихся с /)
mainScene.on('text', ctx => {
    const text = ctx.message.text;
    // Пропускаем команды, начинающиеся с /
    if (text.startsWith('/')) {
        return;
    }
    ctx.reply(MESSAGES.UNKNOWN_COMMAND, getMainKeyboard());
});

// Экспорт функции getOrCreateUser
export { getOrCreateUser };
