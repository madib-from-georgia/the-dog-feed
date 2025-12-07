import { Scenes } from 'telegraf';
import { BotContext } from '../types';
import { SCENES } from '../utils/constants';
import { registerCommonNavigationHandlers, createNavigationKeyboard } from '../ui/navigation';
import { UI_TEXTS } from '../ui/messages';

export const historyScene = new Scenes.BaseScene<BotContext>(SCENES.HISTORY);

// Регистрируем общие обработчики навигации
registerCommonNavigationHandlers(historyScene);

// Клавиатура истории
function getHistoryKeyboard() {
    return createNavigationKeyboard([
        ['📅 сегодня', '📋 всё время']
    ]);
}

// Вход в сцену истории
historyScene.enter(ctx => {
    ctx.reply(UI_TEXTS.history.header, getHistoryKeyboard());
});

// Переход к истории за сегодня
historyScene.hears(/📅 сегодня/, ctx => {
    ctx.scene.enter(SCENES.TODAY_HISTORY);
});

// Переход к полной истории
historyScene.hears(/📋 всё время/, ctx => {
    ctx.scene.enter(SCENES.FULL_HISTORY);
});

// Обработка неизвестных команд
historyScene.on('text', ctx => {
    const text = (ctx.message as any)?.text || '';
    if (!text.startsWith('/')) {
        ctx.reply(UI_TEXTS.navigation.useButtons, getHistoryKeyboard());
    }
});
