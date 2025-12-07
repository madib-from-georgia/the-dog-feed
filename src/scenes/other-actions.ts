import { Scenes } from 'telegraf';
import { BotContext, User } from '../types';
import { SCENES } from '../utils/constants';
import { createUserLink } from '../utils/user-utils';
import { registerCommonNavigationHandlers, createNavigationKeyboard } from '../ui/navigation';
import { UI_TEXTS, MessageBuilder, MessageFormatter } from '../ui/messages';
import { formatDateTime, formatInterval } from '../utils/time-utils';

export const otherActionsScene = new Scenes.BaseScene<BotContext>(
    SCENES.OTHER_ACTIONS
);

// Регистрируем общие обработчики навигации
registerCommonNavigationHandlers(otherActionsScene);

// Локальная функция для получения или создания пользователя
async function getOrCreateUser(
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

// Клавиатура других действий
function getOtherActionsKeyboard() {
    return createNavigationKeyboard([
        ['Когда следующее кормление?'],
        ['📋 История кормлений', '⚙️ Настройки'],
    ]);
}

// Клавиатура управления расписанием
function getScheduleManagementKeyboard() {
    return createNavigationKeyboard([
        ['📅 Запланировать кормление'],
        ['📋 Просмотреть запланированные', '❌ Отменить запланированные'],
    ]);
}

// Вход в сцену других действий
otherActionsScene.enter(ctx => {
    ctx.reply('Выберите действие:', getOtherActionsKeyboard());
});

// Обработка кнопки "Когда следующее кормление?"
otherActionsScene.hears(/Когда следующее кормление\?/, async ctx => {
    try {
        if (!ctx.timerService || !ctx.database) {
            ctx.reply(UI_TEXTS.errors.servicesNotInitialized);
            return;
        }

        const nextFeedingInfo = ctx.timerService.getNextFeedingInfo();

        if (!nextFeedingInfo.isActive || !nextFeedingInfo.time) {
            ctx.reply(
                `${UI_TEXTS.status.paused}\nЧтобы возобновить, нажмите "${UI_TEXTS.feeding.buttonText}"`
            );
            return;
        }

        const currentUser = await ctx.database.getUserByTelegramId(ctx.from!.id);

        const nextFeedingTime = nextFeedingInfo.time;
        const timeString = currentUser
            ? formatDateTime(nextFeedingTime, currentUser.timezone).split(' в ')[1]
            : nextFeedingTime.getHours().toString().padStart(2, '0') +
              ':' +
              nextFeedingTime.getMinutes().toString().padStart(2, '0');

        const now = new Date();
        const timeDiff = nextFeedingTime.getTime() - now.getTime();
        const timeDiffString = formatInterval(Math.floor(timeDiff / (1000 * 60)));

        ctx.reply(`⏰ Следующее кормление в ${timeString} (через ${timeDiffString})`);
    } catch (error) {
        console.error('Ошибка при получении времени следующего кормления:', error);
        ctx.reply(
            MessageFormatter.error('Произошла ошибка при получении времени следующего кормления. ' + UI_TEXTS.common.tryAgain)
        );
    }
});

// Обработка кнопки "Внеочередные кормления"
otherActionsScene.hears(/📅 Внеочередные кормления/, ctx => {
    // Переходим в сцену управления расписанием
    // Но сначала нужно показать клавиатуру управления расписанием
    ctx.reply(
        '📅 Внеочередные кормления\n\n' + 'Выберите действие:',
        getScheduleManagementKeyboard()
    );
});

// Обработка подкнопок управления расписанием
otherActionsScene.hears(/📅 Запланировать кормление/, ctx => {
    ctx.scene.enter(SCENES.SCHEDULE_FEEDING);
});

otherActionsScene.hears(/📋 Просмотреть запланированные/, ctx => {
    ctx.scene.enter(SCENES.SCHEDULED_LIST);
});

otherActionsScene.hears(/❌ Отменить запланированные/, ctx => {
    ctx.scene.enter(SCENES.SCHEDULED_LIST);
});

// Обработка кнопки "История кормлений"
otherActionsScene.hears(/📋 История кормлений/, ctx => {
    ctx.scene.enter(SCENES.HISTORY);
});

// Обработка кнопки "Настройки"
otherActionsScene.hears(/⚙️ Настройки/, ctx => {
    ctx.scene.enter(SCENES.SETTINGS);
});

// Обработка кнопки "📋 На главную к списку"
otherActionsScene.hears(/📋 На главную к списку/, ctx => {
    ctx.scene.enter(SCENES.SCHEDULED_LIST);
});

// Обработка неизвестных команд
otherActionsScene.on('text', ctx => {
    const text = (ctx.message as any)?.text || '';
    if (!text.startsWith('/') && !text.includes('🏠 На главную')) {
        ctx.reply(UI_TEXTS.navigation.useButtons, getOtherActionsKeyboard());
    }
});
