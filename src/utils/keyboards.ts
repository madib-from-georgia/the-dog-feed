import { Markup } from 'telegraf';
import { EMOJIS } from './constants';

// Главная клавиатура
export function getMainKeyboard(showFeedingDetailsButton = false) {
  const keyboard = [];
  
  // Добавляем кнопку "Уточнить детали кормления" если нужно
  if (showFeedingDetailsButton) {
    keyboard.push(['📝 Уточнить детали кормления']);
  }
  
  // Основные кнопки
  // Если показываем кнопку уточнения деталей, то кнопка "Я покормил" не нужна
  if (!showFeedingDetailsButton) {
    keyboard.push([`${EMOJIS.FEED} Я покормил`]);
  }
  
  keyboard.push([`${EMOJIS.STOP} Завершить кормления на сегодня`]);
  keyboard.push([`${EMOJIS.SCHEDULE} Управление расписанием`]);
  keyboard.push([`${EMOJIS.SETTINGS} Настройки`, `${EMOJIS.HISTORY} История кормлений`]);
  
  return Markup.keyboard(keyboard).resize();
}

// Клавиатура настроек (заглушка)
export function getSettingsKeyboard() {
  return Markup.keyboard([
    ['🍽️ Настройки корма'],
    ['⏰ Настройки интервала кормления'],
    ['🔔 Настройки уведомлений'],
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Клавиатура истории (заглушка)
export function getHistoryKeyboard() {
  return Markup.keyboard([
    ['📅 Сегодня'],
    ['📋 Все кормления'],
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Универсальная кнопка "Назад"
export function getBackKeyboard() {
  return Markup.keyboard([
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Клавиатура для управления расписанием
export function getScheduleManagementKeyboard() {
  return Markup.keyboard([
    ['📅 Создать кормление на время'],
    ['📋 Просмотреть запланированные'],
    ['❌ Отменить все запланированные'],
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Клавиатура для создания кормления
export function getScheduleFeedingKeyboard() {
  return Markup.keyboard([
    ['❌ Отменить ввод'],
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Клавиатура для списка запланированных кормлений
export function getScheduledListKeyboard() {
  return Markup.keyboard([
    ['📅 Создать новое кормление'],
    ['❌ Отменить все'],
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Клавиатура для отдельного запланированного кормления
export function getScheduledItemKeyboard(scheduleId: number) {
  return Markup.keyboard([
    [`❌ Отменить кормление ${scheduleId}`],
    ['📋 Назад к списку'],
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Клавиатура для полной истории
export function getFullHistoryKeyboard() {
  return Markup.keyboard([
    ['📤 Экспорт истории', '🔍 Фильтры'],
    ['◀️ Назад', '▶️ Далее'],
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Клавиатура для экспорта
export function getExportKeyboard() {
  return Markup.keyboard([
    ['📋 CSV формат', '🌐 HTML формат'],
    ['📅 За неделю', '🗓️ За месяц', '📊 Все время'],
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Клавиатура для пагинации
export function getPaginationKeyboard(currentPage: number, totalPages: number, hasNext: boolean, hasPrev: boolean) {
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
  buttons.push(['🏠 Выйти на главный экран']);
  
  return Markup.keyboard(buttons).resize();
}
