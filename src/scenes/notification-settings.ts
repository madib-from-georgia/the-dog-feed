import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../types';
import { SCENES } from '../utils/constants';
import { registerCommonNavigationHandlers } from '../ui/navigation';
import { UI_TEXTS, MessageFormatter } from '../ui/messages';

export const notificationSettingsScene = new Scenes.BaseScene<BotContext>(
    SCENES.NOTIFICATION_SETTINGS
);

// Регистрируем общие обработчики навигации (с кнопкой "Назад")
registerCommonNavigationHandlers(notificationSettingsScene, {
    hasBackButton: true,
    backTo: SCENES.SETTINGS
});

// Вход в сцену настроек уведомлений
notificationSettingsScene.enter(async ctx => {
    try {
        if (!ctx.database) {
            ctx.reply(UI_TEXTS.errors.databaseNotInitialized);
            return;
        }

        const user = await ctx.database.getUserByTelegramId(ctx.from!.id);

        if (!user) {
            ctx.reply(MessageFormatter.error(UI_TEXTS.errors.userNotFound));
            return;
        }

        const statusText = user.notificationsEnabled ? 'Включены' : 'Выключены';
        const statusEmoji = user.notificationsEnabled ? '🔔' : '🔕';

        const message =
            `${statusEmoji} ${UI_TEXTS.settings.notificationsHeader}\n\n` +
            `Текущий статус: ${statusText}\n\n` +
            `Уведомления включают:\n` +
            `• Сообщения о кормлении собаки\n` +
            `• Напоминания "Пора покормить!"\n` +
            `• Изменения настроек корма\n` +
            `• Остановку/возобновление кормлений\n\n` +
            `Выберите действие:`;

        const keyboard = user.notificationsEnabled
            ? Markup.keyboard([
                  ['🔕 Выключить уведомления'],
                  ['⬅️ Назад', '🏠 На главную'],
              ]).resize()
            : Markup.keyboard([
                  ['🔔 Включить уведомления'],
                  ['⬅️ Назад', '🏠 На главную'],
              ]).resize();

        ctx.reply(message, keyboard);
    } catch (error) {
        console.error('Ошибка получения настроек уведомлений:', error);
        ctx.reply(
            MessageFormatter.error('Ошибка получения настроек. ' + UI_TEXTS.common.tryAgain),
            Markup.keyboard([['🏠 На главную']]).resize()
        );
    }
});

// Обработка кнопки "Включить уведомления"
notificationSettingsScene.hears(/🔔 Включить уведомления/, async ctx => {
    try {
        if (!ctx.database) {
            ctx.reply(UI_TEXTS.errors.databaseNotInitialized);
            return;
        }

        const user = await ctx.database.getUserByTelegramId(ctx.from!.id);

        if (!user) {
            ctx.reply(MessageFormatter.error(UI_TEXTS.errors.userNotFound));
            return;
        }

        await ctx.database.updateUserNotifications(user.id, true);

        console.log(
            `Уведомления включены для пользователя: ${user.username || user.telegramId}`
        );

        // Обновляем экран
        ctx.scene.reenter();
    } catch (error) {
        console.error('Ошибка включения уведомлений:', error);
        ctx.reply(MessageFormatter.error('Ошибка сохранения настроек'));
    }
});

// Обработка кнопки "Выключить уведомления"
notificationSettingsScene.hears(/🔕 Выключить уведомления/, async ctx => {
    try {
        if (!ctx.database) {
            ctx.reply(UI_TEXTS.errors.databaseNotInitialized);
            return;
        }

        const user = await ctx.database.getUserByTelegramId(ctx.from!.id);

        if (!user) {
            ctx.reply(MessageFormatter.error(UI_TEXTS.errors.userNotFound));
            return;
        }

        await ctx.database.updateUserNotifications(user.id, false);

        console.log(
            `Уведомления выключены для пользователя: ${user.username || user.telegramId}`
        );

        // Обновляем экран
        ctx.scene.reenter();
    } catch (error) {
        console.error('Ошибка выключения уведомлений:', error);
        ctx.reply(MessageFormatter.error('Ошибка сохранения настроек'));
    }
});

// Обработка неизвестных команд
notificationSettingsScene.on('text', async ctx => {
    const text = (ctx.message as any)?.text || '';
    if (text.startsWith('/')) {
        return;
    }

    try {
        if (!ctx.database) {
            ctx.reply(UI_TEXTS.navigation.useButtons);
            return;
        }

        const user = await ctx.database.getUserByTelegramId(ctx.from!.id);

        const keyboard = user?.notificationsEnabled
            ? Markup.keyboard([
                  ['🔕 Выключить уведомления'],
                  ['⬅️ Назад', '🏠 На главную'],
              ]).resize()
            : Markup.keyboard([
                  ['🔔 Включить уведомления'],
                  ['⬅️ Назад', '🏠 На главную'],
              ]).resize();

        ctx.reply(UI_TEXTS.navigation.useButtons, keyboard);
    } catch (error) {
        ctx.reply(UI_TEXTS.navigation.useButtons);
    }
});
