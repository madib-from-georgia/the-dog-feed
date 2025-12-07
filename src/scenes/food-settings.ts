import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../types';
import { FeedingParser } from '../services/feeding-parser';
import { SCENES } from '../utils/constants';
import { registerCommonNavigationHandlers, getBackAndHomeKeyboard } from '../ui/navigation';
import { UI_TEXTS, MessageFormatter, MessageBuilder } from '../ui/messages';

export const foodSettingsScene = new Scenes.BaseScene<BotContext>(
    SCENES.FOOD_SETTINGS
);

// Регистрируем общие обработчики навигации
registerCommonNavigationHandlers(foodSettingsScene, {
    hasBackButton: true,
    backTo: SCENES.SETTINGS
});

// Вход в сцену настроек корма
foodSettingsScene.enter(async ctx => {
    try {
        if (!ctx.database) {
            ctx.reply(UI_TEXTS.errors.databaseNotInitialized);
            return;
        }

        // Получаем текущие настройки из БД
        const currentType =
            (await ctx.database.getSetting('default_food_type')) || 'dry';
        const currentAmount =
            (await ctx.database.getSetting('default_food_amount')) || '12';

        const currentSettings = MessageBuilder.currentSettings({
            type: currentType,
            amount: currentAmount
        });

        const message =
            `${UI_TEXTS.settings.foodHeader}\n\n` +
            `${currentSettings}\n\n` +
            `Введите новые настройки корма:\n\n` +
            `Примеры форматов:\n` +
            FeedingParser.getExamples()
                .map(example => `• ${example}`)
                .join('\n');

        ctx.reply(message, getBackAndHomeKeyboard());
    } catch (error) {
        console.error('Ошибка получения настроек корма:', error);
        ctx.reply(
            MessageFormatter.error('Ошибка получения настроек. ' + UI_TEXTS.common.tryAgain),
            getBackAndHomeKeyboard()
        );
    }
});

// Обработка ввода настроек корма
foodSettingsScene.on('text', async ctx => {
    const text = (ctx.message as any)?.text || '';

    // Пропускаем обработку навигационных кнопок и команд
    if (text.includes('🏠 На главную') || text.includes('⬅️ Назад') || text.startsWith('/')) {
        return;
    }

    try {
        if (!ctx.database) {
            ctx.reply(UI_TEXTS.errors.databaseNotInitialized);
            return;
        }

        // Парсинг введенных настроек
        const parsed = FeedingParser.parseDetails(text);

        if (!parsed.isValid) {
            ctx.reply(
                MessageFormatter.error(`${parsed.error}\n\nПопробуйте еще раз или используйте примеры выше.`),
                getBackAndHomeKeyboard()
            );
            return;
        }

        // Сохранение новых настроек
        let updatedSettings = [];

        if (parsed.amount !== undefined) {
            await ctx.database.setSetting(
                'default_food_amount',
                parsed.amount.toString()
            );
            updatedSettings.push(`количество: ${parsed.amount} граммов`);
        }

        if (parsed.foodType !== undefined) {
            await ctx.database.setSetting(
                'default_food_type',
                parsed.foodType
            );
            const typeText = parsed.foodType === 'dry' ? 'сухой' : 'влажный';
            updatedSettings.push(`тип: ${typeText}`);
        }

        const user = await ctx.database.getUserByTelegramId(ctx.from!.id);
        const username = user?.username || 'Пользователь';

        // Создаем сообщение используя MessageBuilder
        const notificationMessage = MessageBuilder.settingsUpdated(
            UI_TEXTS.settings.foodUpdated,
            updatedSettings,
            username
        );

        // Уведомление других пользователей об изменении
        const allUsers = await ctx.database.getAllUsers();
        for (const u of allUsers) {
            // Не отправляем уведомление пользователю, который сделал изменения
            if (u.telegramId !== ctx.from!.id && u.notificationsEnabled) {
                try {
                    await ctx.telegram.sendMessage(
                        u.telegramId,
                        `🍽️ ${notificationMessage}`
                    );
                } catch (error) {
                    console.error(
                        `Ошибка отправки уведомления пользователю ${u.telegramId}:`,
                        error
                    );
                }
            }
        }

        console.log(
            `Настройки корма изменены: ${updatedSettings.join(', ')} пользователем ${username}`
        );

        // Отправляем подтверждение только текущему пользователю
        ctx.reply(
            MessageFormatter.success(UI_TEXTS.settings.foodUpdated) +
                `\n\nНовые настройки: ${updatedSettings.join(', ')}\n\n` +
                UI_TEXTS.settings.changesApplied,
            getBackAndHomeKeyboard()
        );
    } catch (error) {
        console.error('Ошибка сохранения настроек корма:', error);
        ctx.reply(
            MessageFormatter.error('Ошибка сохранения настроек. ' + UI_TEXTS.common.tryAgain),
            getBackAndHomeKeyboard()
        );
    }
});
