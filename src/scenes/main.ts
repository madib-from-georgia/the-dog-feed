import { Scenes } from 'telegraf';
import { BotContext, User, Feeding } from '../types';
import { getMainKeyboard } from '../utils/keyboards';
import { SCENES } from '../utils/constants';
import { formatDateTime, formatInterval } from '../utils/time-utils';
import { createUserLink } from '../utils/user-utils';
import { registerCommonNavigationHandlers } from '../ui/navigation';
import { UI_TEXTS, MessageFormatter, MessageBuilder } from '../ui/messages';

export const mainScene = new Scenes.BaseScene<BotContext>(SCENES.MAIN);

/**
 * Функция для получения или создания пользователя
 * Экспортируется для использования в других сценах
 */
export async function getOrCreateUser(
    ctx: BotContext,
    telegramId: number,
    username?: string
): Promise<User> {
    if (!ctx.database) {
        throw new Error('Database не инициализирована');
    }

    let user = await ctx.database.getUserByTelegramId(telegramId);

    if (!user) {
        user = await ctx.database.createUser(telegramId, username);
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
    if (!ctx.session?.firstVisitDone) {
        if (ctx.session) {
            ctx.session.firstVisitDone = true;
        }
        ctx.reply(UI_TEXTS.welcome, getMainKeyboard());
    } else {
        ctx.reply(UI_TEXTS.navigation.goingHome, getMainKeyboard());
    }
});

/**
 * Автоматическое определение и сохранение часового пояса пользователя
 */
async function autoDetectAndSaveTimezone(
    ctx: BotContext,
    telegramId: number
): Promise<string | null> {
    if (!ctx.database) {
        return null;
    }

    try {
        let dbUser = await ctx.database.getUserByTelegramId(telegramId);

        if (dbUser && !dbUser.timezone) {
            const timezone = 'Europe/Moscow';
            await ctx.database.updateUserTimezone(dbUser.id, timezone);
            console.log(
                `Установлен часовой пояс для пользователя ${dbUser.username || dbUser.telegramId}: ${timezone}`
            );
            return timezone;
        }

        return dbUser?.timezone || null;
    } catch (error) {
        console.error(
            'Ошибка при автоматическом определении часового пояса:',
            error
        );
        return null;
    }
}

// Обработка кнопки "Другие действия"
mainScene.hears(/Другие действия/, ctx => {
    ctx.scene.enter(SCENES.OTHER_ACTIONS);
});

// Обработка кнопки "Собачка поел"
mainScene.hears(/🍽️ Собачка поел/, async ctx => {
    try {
        if (!ctx.timerService || !ctx.database) {
            ctx.reply(UI_TEXTS.errors.servicesNotInitialized);
            return;
        }

        // Получаем или создаем пользователя в базе данных
        let dbUser = await ctx.database.getUserByTelegramId(ctx.from!.id);
        if (!dbUser) {
            dbUser = await ctx.database.createUser(
                ctx.from!.id,
                ctx.from!.username || ctx.from!.first_name
            );
        }

        // Автоматически определяем и сохраняем часовой пояс
        const timezone = await autoDetectAndSaveTimezone(ctx, ctx.from!.id);
        if (timezone) {
            dbUser.timezone = timezone;
        }

        // Получаем обновленного пользователя с таймзоной
        const updatedUser = await ctx.database.getUserByTelegramId(ctx.from!.id);
        if (updatedUser) {
            dbUser = updatedUser;
        }

        // Получаем текущие настройки корма из БД
        const foodType =
            (await ctx.database.getSetting('default_food_type')) || 'dry';
        const foodAmount = parseInt(
            (await ctx.database.getSetting('default_food_amount')) || '12'
        );

        // Создание записи о кормлении
        const dbFeeding = await ctx.database.createFeeding(
            dbUser.id,
            foodType,
            foodAmount
        );

        // Сохраняем ID кормления в сессии для возможности уточнения деталей
        if (!ctx.session) {
            ctx.session = {};
        }
        ctx.session.lastFeedingId = dbFeeding.id;

        // Запуск таймера на следующее кормление
        ctx.timerService.startFeedingTimer();

        // Получение информации о следующем кормлении
        const nextFeedingInfo = ctx.timerService.getNextFeedingInfo();

        // Форматирование данных для сообщения
        const intervalText = formatInterval(nextFeedingInfo.intervalMinutes);
        const timestamp = formatDateTime(dbFeeding.timestamp, dbUser?.timezone).replace(', ', ' в ');
        const nextFeedingTime = nextFeedingInfo.time
            ? formatDateTime(nextFeedingInfo.time, dbUser?.timezone).split(' в ')[1]
            : 'неизвестно';

        // Создание сообщения используя MessageBuilder
        const message = MessageBuilder.feedingNotification({
            timestamp,
            username: createUserLink(dbUser),
            amount: foodAmount,
            foodType,
            nextFeedingTime,
            interval: intervalText
        });

        // Уведомление всех пользователей
        const allUsers = await ctx.database.getAllUsers();
        for (const u of allUsers) {
            if (u.telegramId === ctx.from!.id) {
                continue; // Пропускаем текущего пользователя
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

        // Показываем сообщение об успешном кормлении
        await ctx.reply(message, getMainKeyboard());
    } catch (error) {
        console.error('Ошибка при обработке кормления:', error);
        ctx.reply(MessageFormatter.error('Произошла ошибка при записи кормления. ' + UI_TEXTS.common.tryAgain));
    }
});

// УДАЛЕНО: Обработчик "Завершить кормления на сегодня"
// Эта функциональность уже реализована в other-actions.ts
// Дублирование кода устранено

// Обработка команды /status
mainScene.command('status', async ctx => {
    try {
        if (!ctx.timerService || !ctx.database) {
            ctx.reply(UI_TEXTS.errors.servicesNotInitialized);
            return;
        }

        const nextFeeding = ctx.timerService.getNextFeedingInfo();
        const lastFeeding = await ctx.database.getLastFeeding();
        const stats = await ctx.database.getStats();

        // Получаем текущего пользователя
        const currentUser = await ctx.database.getUserByTelegramId(ctx.from!.id);

        let message = `${UI_TEXTS.status.header}`;

        if (lastFeeding) {
            const lastUser = await ctx.database.getUserById(lastFeeding.userId);
            const username = createUserLink(lastUser);
            message += `${UI_TEXTS.status.lastFeeding}\n`;
            message += `   Время: ${formatDateTime(lastFeeding.timestamp, lastUser?.timezone)}\n`;
            message += `   Кто: ${username}\n\n`;
        } else {
            message += UI_TEXTS.status.noFeedings;
        }

        // Форматирование интервала используя утилиту
        const intervalText = formatInterval(nextFeeding.intervalMinutes);
        message += `${UI_TEXTS.status.interval}: ${intervalText}\n\n`;

        if (nextFeeding.isActive && nextFeeding.time) {
            message += `${UI_TEXTS.status.nextFeeding} в ${formatDateTime(nextFeeding.time, currentUser?.timezone)}\n\n`;
        } else {
            message += `${UI_TEXTS.status.paused}\n\n`;
        }

        // Добавляем статистику
        message += `${UI_TEXTS.status.statistics}\n`;
        message += `   👥 Пользователей: ${stats.totalUsers}\n`;
        message += `   🍽️ Кормлений сегодня: ${stats.todayFeedings}\n`;
        message += `   📈 Всего кормлений: ${stats.totalFeedings}`;

        ctx.reply(message);
    } catch (error) {
        console.error('Ошибка в команде /status:', error);
        ctx.reply(MessageFormatter.error('Ошибка при получении статуса. ' + UI_TEXTS.common.tryAgain));
    }
});

// Обработка кнопки "⏹️ Завершить кормления на сегодня"
mainScene.hears(/⏹️ Завершить кормления на сегодня/, async ctx => {
    try {
        if (!ctx.timerService || !ctx.database) {
            ctx.reply(UI_TEXTS.errors.servicesNotInitialized);
            return;
        }

        const dbUser = await ctx.database.getUserByTelegramId(ctx.from!.id);
        if (!dbUser) {
            ctx.reply(UI_TEXTS.errors.userNotFound);
            return;
        }

        ctx.timerService.stopAllTimers();

        const message = MessageBuilder.feedingStopped(createUserLink(dbUser));

        // Уведомление всех пользователей
        const allUsers = await ctx.database.getAllUsers();
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

        console.log(`Кормления остановлены пользователем: ${dbUser.username}`);

        // Остаемся на главном экране
        ctx.reply('Кормления на сегодня завершены', getMainKeyboard());
    } catch (error) {
        console.error('Ошибка при остановке кормлений:', error);
        ctx.reply(MessageFormatter.error('Произошла ошибка при остановке кормлений. ' + UI_TEXTS.common.tryAgain));
    }
});

// Обработка команды /home
mainScene.command('home', ctx => {
    ctx.reply(UI_TEXTS.navigation.goingHome, getMainKeyboard());
});

// Обработка кнопки "Уточнить детали кормления"
mainScene.hears(/📝 Уточнить детали кормления/, ctx => {
    ctx.scene.enter(SCENES.FEEDING_DETAILS);
});

// Регистрируем общие обработчики навигации ПОСЛЕ специфичных
// Это важно: в Telegraf обработчики выполняются в порядке регистрации
registerCommonNavigationHandlers(mainScene);

// Обработка неизвестных команд
mainScene.on('text', ctx => {
    const text = (ctx.message as any)?.text || '';
    // Пропускаем команды и навигационные кнопки
    if (text.startsWith('/') || text.includes('🏠')) {
        return;
    }
    ctx.reply(UI_TEXTS.navigation.unknownCommand, getMainKeyboard());
});
