import { Scenes } from 'telegraf';
import { BotContext } from '../types';
import { getHistoryKeyboard } from '../utils/keyboards';
import { MESSAGES, SCENES } from '../utils/constants';

export const historyScene = new Scenes.BaseScene<BotContext>(SCENES.HISTORY);

// Вход в сцену истории
historyScene.enter((ctx) => {
  const message = '📋 История кормлений\n\nВыберите период для просмотра:';
  ctx.reply(message, getHistoryKeyboard());
});

// Переход к истории за сегодня
historyScene.hears(/📅 сегодня/, (ctx) => {
  ctx.scene.enter(SCENES.TODAY_HISTORY);
});

historyScene.hears(/📋 всё время/, (ctx) => {
  ctx.scene.enter(SCENES.FULL_HISTORY);
});


// Обработка кнопки "На главную"
historyScene.hears(/🏠 На главную/, (ctx) => {
  ctx.scene.enter(SCENES.MAIN);
});

// Обработка команды /home
historyScene.command('home', (ctx) => {
  ctx.scene.enter(SCENES.MAIN);
});

// Обработка неизвестных команд (но не команд, начинающихся с /)
historyScene.on('text', (ctx) => {
  const text = ctx.message.text;
  // Пропускаем команды, начинающиеся с /
  if (text.startsWith('/')) {
    return;
  }
  
  ctx.reply(
    'Используйте кнопки меню для навигации.',
    getHistoryKeyboard()
  );
});

