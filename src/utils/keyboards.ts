import { Markup } from 'telegraf';
import { EMOJIS } from './constants';

// Главная клавиатура
export function getMainKeyboard() {
    return Markup.keyboard([
        ['🍽️ Собачка поел', '📝 Уточнить детали кормления'],
        ['⏹️ Завершить кормления на сегодня'],
        ['Другие действия']
    ]).resize();
}

// Клавиатура настроек
export function getSettingsKeyboard() {
    return Markup.keyboard([
        ['🍽️ корм', '⏰ интервал', '🔔 уведомления'],
        ['🏠 На главную'],
    ]).resize();
}

// Клавиатура истории
export function getHistoryKeyboard() {
    return Markup.keyboard([
        ['📅 сегодня', '📋 всё время'],
        ['🏠 На главную'],
    ]).resize();
}

// Универсальная кнопка "На главную"
export function getBackKeyboard() {
    return Markup.keyboard([['🏠 На главную']]).resize();
}

// Клавиатура для управления расписанием
export function getScheduleManagementKeyboard() {
    return Markup.keyboard([
        ['📅 Запланировать кормление'],
        ['📋 Просмотреть запланированные', '❌ Отменить запланированные'],
        ['🏠 На главную'],
    ]).resize();
}

// Клавиатура для создания кормления
export function getScheduleFeedingKeyboard() {
    return Markup.keyboard([['❌ Отменить ввод'], ['🏠 На главную']]).resize();
}

// Клавиатура для списка запланированных кормлений
export function getScheduledListKeyboard() {
    return Markup.keyboard([
        ['📅 Создать новое кормление'],
        ['❌ Отменить все'],
        ['🏠 На главную'],
    ]).resize();
}

// Клавиатура для отдельного запланированного кормления
export function getScheduledItemKeyboard(scheduleId: number) {
    return Markup.keyboard([
        [`❌ Отменить кормление ${scheduleId}`],
        ['📋 На главную к списку'],
        ['🏠 На главную'],
    ]).resize();
}

// Клавиатура для полной истории
export function getFullHistoryKeyboard() {
    return Markup.keyboard([
        ['📤 Экспорт истории', '🔍 Фильтры'],
        ['▶️ Далее'],
        ['⬅️ Назад', '🏠 На главную'],
    ]).resize();
}

// Клавиатура для экспорта
export function getExportKeyboard() {
    return Markup.keyboard([
        ['📋 CSV формат', '🌐 HTML формат'],
        ['📅 За неделю', '🗓️ За месяц', '📊 Все время'],
        ['🏠 На главную'],
    ]).resize();
}

// Клавиатура для пагинации
export function getPaginationKeyboard(
    currentPage: number,
    totalPages: number,
    hasNext: boolean,
    hasPrev: boolean
) {
    const buttons = [];

    // Кнопки навигации
    if (hasPrev && hasNext) {
        buttons.push(['◀️ Предыдущая', '▶️ Следующая']);
    } else if (hasPrev) {
        buttons.push(['◀️ Предыдущая']);
    } else if (hasNext) {
        buttons.push(['▶️ Следующая']);
    }

    // Информация о странице
    if (totalPages > 1) {
        buttons.push([`📄 Страница ${currentPage} из ${totalPages}`]);
    }

    // Дополнительные действия
    buttons.push(['📤 Экспорт истории']);
    buttons.push(['⬅️ Назад', '🏠 На главную']);

    return Markup.keyboard(buttons).resize();
}

// Клавиатура для других действий
export function getOtherActionsKeyboard() {
    return Markup.keyboard([
        ['Когда следующее?', '📋 История', '⚙️ Настройки'],
        ['🏠 На главную'],
    ]).resize();
}
