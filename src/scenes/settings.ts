import { Scenes } from 'telegraf';
import { BotContext } from '../types';
import { SCENES } from '../utils/constants';
import { registerCommonNavigationHandlers, createNavigationKeyboard } from '../ui/navigation';
import { UI_TEXTS } from '../ui/messages';

export const settingsScene = new Scenes.BaseScene<BotContext>(SCENES.SETTINGS);

// Регистрируем общие обработчики навигации
registerCommonNavigationHandlers(settingsScene);

// Клавиатура настроек
function getSettingsKeyboard() {
    return createNavigationKeyboard([
        ['🍽️ корм', '⏰ интервал', '🔔 уведомления']
    ]);
}

// Вход в сцену настроек
settingsScene.enter(ctx => {
    ctx.reply(UI_TEXTS.settings.header, getSettingsKeyboard());
});

// Обработка кнопки "корм"
settingsScene.hears(/🍽️ корм/, ctx => {
    ctx.scene.enter(SCENES.FOOD_SETTINGS);
});

// Обработка кнопки "интервал"
settingsScene.hears(/⏰ интервал/, ctx => {
    ctx.scene.enter(SCENES.INTERVAL_SETTINGS);
});

// Обработка кнопки "уведомления"
settingsScene.hears(/🔔 уведомления/, ctx => {
    ctx.scene.enter(SCENES.NOTIFICATION_SETTINGS);
});

// Обработка неизвестных команд
settingsScene.on('text', ctx => {
    const text = (ctx.message as any)?.text || '';
    if (!text.startsWith('/')) {
        ctx.reply(UI_TEXTS.navigation.useButtons, getSettingsKeyboard());
    }
});
