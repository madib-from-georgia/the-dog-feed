import { Scenes } from 'telegraf';
import { BotContext } from '../types';
import { TimeParser } from '../services/time-parser';
import { SCENES } from '../utils/constants';
import { registerCommonNavigationHandlers, getBackAndHomeKeyboard } from '../ui/navigation';
import { UI_TEXTS, MessageFormatter } from '../ui/messages';

export const intervalSettingsScene = new Scenes.BaseScene<BotContext>(
    SCENES.INTERVAL_SETTINGS
);

// Регистрируем общие обработчики навигации
registerCommonNavigationHandlers(intervalSettingsScene, {
    hasBackButton: true,
    backTo: SCENES.SETTINGS
});

// Вход в сцену настройки интервала
intervalSettingsScene.enter(ctx => {
    let currentInterval = 210; // 3.5 часа по умолчанию

    // Получаем текущий интервал из timerService, если доступен
    if (ctx.timerService) {
        currentInterval = ctx.timerService.getCurrentInterval();
    }

    const formattedInterval = TimeParser.formatInterval(currentInterval);

    const message =
        `${UI_TEXTS.settings.intervalHeader}\n\n` +
        `Текущий интервал: ${formattedInterval}\n\n` +
        `Введите новый интервал (от 1 минуты до 24 часов):\n\n` +
        `Примеры форматов:\n` +
        TimeParser.getExamples()
            .map(example => `• ${example}`)
            .join('\n');

    ctx.reply(message, getBackAndHomeKeyboard());
});

// Обработка ввода интервала
intervalSettingsScene.on('text', ctx => {
    const text = (ctx.message as any)?.text || '';

    // Пропускаем навигационные кнопки и команды
    if (text.includes('🏠 На главную') || text.includes('⬅️ Назад') || text.startsWith('/')) {
        return;
    }

    // Парсинг введенного интервала
    const parsed = TimeParser.parseInterval(text);

    if (!parsed.isValid) {
        ctx.reply(
            MessageFormatter.error(`${parsed.error}\n\nПопробуйте еще раз или используйте примеры выше.`),
            getBackAndHomeKeyboard()
        );
        return;
    }

    // Сохранение нового интервала
    if (!ctx.session) {
        ctx.session = {};
    }
    ctx.session.feedingInterval = parsed.minutes;

    // Обновление интервала в сервисе таймеров
    if (ctx.timerService) {
        ctx.timerService.updateInterval(parsed.minutes);
        console.log(
            `Интервал обновлен в timerService: ${parsed.minutes} минут`
        );
    } else {
        console.error(UI_TEXTS.errors.timerNotInitialized);
    }

    const formattedInterval = TimeParser.formatInterval(parsed.minutes);

    ctx.reply(
        MessageFormatter.success(UI_TEXTS.settings.intervalUpdated) +
            `\n\nНовый интервал: ${formattedInterval}\n\n` +
            UI_TEXTS.settings.changesApplied,
        getBackAndHomeKeyboard()
    );

    console.log(
        `Интервал кормления изменен на ${parsed.minutes} минут пользователем ${ctx.from?.username || ctx.from?.id}`
    );
});
