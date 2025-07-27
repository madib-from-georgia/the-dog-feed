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
  
  // Добавляем кнопку "другие действия"
  keyboard.push(['Другие действия']);
  
  return Markup.keyboard(keyboard).resize();
}

// Клавиатура настроек
export function getSettingsKeyboard() {
  return Markup.keyboard([
    ['🍽️ Настройки корма', '⏰ Настройки интервала кормления', '🔔 Настройки уведомлений'],
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Клавиатура истории
export function getHistoryKeyboard() {
  return Markup.keyboard([
    ['📅 Сегодня', '📋 Все кормления'],
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Универсальная кнопка "Выйти на главный экран"
export function getBackKeyboard() {
  return Markup.keyboard([
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Клавиатура для управления расписанием
export function getScheduleManagementKeyboard() {
  return Markup.keyboard([
    ['📅 Запланировать кормление'],
    ['📋 Просмотреть запланированные', '❌ Отменить запланированные'],
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
    ['📋 Выйти на главный экран к списку'],
    ['🏠 Выйти на главный экран']
  ]).resize();
}

// Клавиатура для полной истории
export function getFullHistoryKeyboard() {
  return Markup.keyboard([
    ['📤 Экспорт истории', '🔍 Фильтры'],
    ['◀️ Выйти на главный экран', '▶️ Далее'],
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

// Клавиатура для других действий
export function getOtherActionsKeyboard() {
  return Markup.keyboard([
    ['⏹️ Завершить кормления на сегодня'],
    ['📅 Управление расписанием'],
    ['📋 История кормлений'],
    ['⚙️ Настройки'],
    ['🏠 Выйти на главный экран']
  ]).resize();
}
