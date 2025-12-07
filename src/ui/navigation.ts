import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../types';
import { SCENES } from '../utils/constants';

/**
 * Централизованное управление навигацией для устранения дублирования
 * Все navigation handlers регистрируются здесь один раз
 */

/**
 * Регистрирует общие обработчики навигации для сцены
 * Устраняет дублирование кода "На главную", "Назад" и т.д.
 */
export function registerCommonNavigationHandlers(
    scene: Scenes.BaseScene<BotContext>,
    options: {
        hasBackButton?: boolean;
        backTo?: string;
    } = {}
) {
    // Обработчик кнопки "🏠 На главную" - используется везде
    scene.hears(/🏠 На главную/, ctx => {
        ctx.scene.enter(SCENES.MAIN);
    });

    // Обработчик команды /home
    scene.command('home', ctx => {
        ctx.scene.enter(SCENES.MAIN);
    });

    // Обработчик кнопки "⬅️ Назад" - если указан
    if (options.hasBackButton && options.backTo) {
        scene.hears(/⬅️ Назад/, ctx => {
            ctx.scene.enter(options.backTo);
        });
    }

    // ПРИМЕЧАНИЕ: Обработчик on('text') НЕ регистрируется здесь,
    // так как он может перехватывать сообщения раньше специфичных hears()
    // Каждая сцена должна регистрировать свой обработчик on('text') самостоятельно
}

/**
 * Создает стандартную клавиатуру с кнопками навигации
 */
export function createNavigationKeyboard(
    mainButtons: string[][],
    options: {
        hasBackButton?: boolean;
        hasHomeButton?: boolean;
        customBottomButtons?: string[];
    } = {}
): ReturnType<typeof Markup.keyboard> {
    const buttons = [...mainButtons];

    // Добавляем нижний ряд навигации
    const navigationRow: string[] = [];

    if (options.hasBackButton) {
        navigationRow.push('⬅️ Назад');
    }

    if (options.hasHomeButton !== false) {
        // По умолчанию true
        navigationRow.push('🏠 На главную');
    }

    if (options.customBottomButtons) {
        navigationRow.push(...options.customBottomButtons);
    }

    if (navigationRow.length > 0) {
        buttons.push(navigationRow);
    }

    return Markup.keyboard(buttons).resize();
}

/**
 * Получает только кнопку "На главную"
 */
export function getHomeKeyboard() {
    return Markup.keyboard([['🏠 На главную']]).resize();
}

/**
 * Получает кнопки "Назад" и "На главную"
 */
export function getBackAndHomeKeyboard() {
    return Markup.keyboard([['⬅️ Назад', '🏠 На главную']]).resize();
}
