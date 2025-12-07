import { Scenes } from 'telegraf';
import { BotContext } from '../types';
import { FeedingParser } from '../services/feeding-parser';
import { SCENES } from '../utils/constants';
import { getTimeOffsetInMinutes } from '../utils/timezone-utils';
import { formatDateTime } from '../utils/time-utils';
import { registerCommonNavigationHandlers, getHomeKeyboard } from '../ui/navigation';
import { UI_TEXTS, MessageFormatter } from '../ui/messages';

export const feedingDetailsScene = new Scenes.BaseScene<BotContext>(
    SCENES.FEEDING_DETAILS
);

// Регистрируем общие обработчики навигации
registerCommonNavigationHandlers(feedingDetailsScene);

// Вход в сцену уточнения деталей
feedingDetailsScene.enter(async ctx => {
    if (!ctx.database) {
        ctx.reply(UI_TEXTS.errors.databaseNotInitialized, getHomeKeyboard());
        return;
    }

    try {
        // Получаем ID последнего кормления из сессии
        let lastFeedingId = ctx.session?.lastFeedingId;

        // Если ID не найден в сессии, получаем последнее кормление из БД
        if (!lastFeedingId) {
            const lastFeeding = await ctx.database.getLastFeeding();
            if (!lastFeeding) {
                ctx.reply(
                    MessageFormatter.error(UI_TEXTS.feeding.noRecentFeeding),
                    getHomeKeyboard()
                );
                return;
            }
            lastFeedingId = lastFeeding.id;
            // Сохраняем ID в сессию для последующих операций
            if (ctx.session) {
                ctx.session.lastFeedingId = lastFeedingId;
            }
        }

        ctx.reply(UI_TEXTS.feeding.detailsPrompt, getHomeKeyboard());
    } catch (error) {
        console.error('Ошибка при получении последнего кормления:', error);
        ctx.reply(
            MessageFormatter.error('Произошла ошибка. ' + UI_TEXTS.common.tryAgain),
            getHomeKeyboard()
        );
    }
});

// Обработка ввода деталей
feedingDetailsScene.on('text', async ctx => {
    const text = (ctx.message as any)?.text || '';

    // Пропускаем навигационные кнопки и команды
    if (text.includes('🏠 На главную') || text.startsWith('/')) {
        return;
    }

    const lastFeedingId = ctx.session?.lastFeedingId;
    if (!lastFeedingId) {
        ctx.reply(MessageFormatter.error(UI_TEXTS.feeding.detailsError));
        return;
    }

    if (!ctx.database) {
        ctx.reply(UI_TEXTS.errors.databaseNotInitialized);
        return;
    }

    try {
        const user = await ctx.database.getUserByTelegramId(ctx.from!.id);

        let feedingTime: Date | undefined = undefined;
        let detailsText = text;

        // Ищем время в формате HH:mm в любом месте текста
        const timeRegex = /(\d{1,2}):(\d{2})/;
        const timeMatch = text.match(timeRegex);

        if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);

            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                if (user?.timezone) {
                    try {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = now.getMonth();
                        const day = now.getDate();

                        const feedingTimeStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
                        // Создаем дату в UTC
                        feedingTime = new Date(feedingTimeStr + 'Z');
                        // Для часового пояса пользователя получаем смещение времени
                        const offsetMinutes = getTimeOffsetInMinutes(now, now.getTime() / 1000);
                        // Корректируем время: если пользователь в UTC+3, то UTC время должно быть на 3 часа меньше
                        feedingTime = new Date(feedingTime.getTime() - offsetMinutes * 60 * 1000);
                    } catch (error) {
                        console.error('Ошибка при создании даты с учетом часового пояса:', error);
                        // В случае ошибки используем стандартное создание даты
                        const now = new Date();
                        feedingTime = new Date(now);
                        feedingTime.setHours(hours, minutes, 0, 0);
                    }
                } else {
                    // Если часовой пояс не установлен, используем стандартное создание даты
                    const now = new Date();
                    feedingTime = new Date(now);
                    feedingTime.setHours(hours, minutes, 0, 0);

                    // Время распаршено без учета часового пояса
                }

                // Убираем найденное время из текста деталей
                detailsText = text.replace(timeRegex, '').trim();

                // Если после удаления времени не осталось текста, используем оригинальный текст
                if (detailsText === '') {
                    detailsText = text;
                }
            }
        }

        // Парсинг введенных деталей
        const parsed = FeedingParser.parseDetails(detailsText);

        if (!parsed.isValid && parsed.error) {
            ctx.reply(
                MessageFormatter.error(`${parsed.error}\n\nПопробуйте еще раз или используйте примеры выше.`),
                getHomeKeyboard()
            );
            return;
        }

        // Обновляем запись о кормлении в БД
        await ctx.database.updateFeedingDetails(
            lastFeedingId,
            parsed.amount,
            parsed.foodType,
            parsed.details,
            feedingTime
        );

        // Если время кормления было изменено, перезапускаем таймер
        if (feedingTime && ctx.timerService?.isTimerActive()) {
            const intervalMinutes = ctx.timerService.getCurrentInterval();
            ctx.timerService.startFeedingTimer(intervalMinutes, feedingTime);
            console.log(`Таймер перезапущен с учетом нового времени: ${formatDateTime(feedingTime, user?.timezone)}`);
        }

        // Формируем сообщение об обновлении
        let updateMessage = MessageFormatter.success(UI_TEXTS.feeding.detailsUpdated) + '\n\n';
        if (feedingTime) {
            updateMessage += `⏰ Время: ${formatDateTime(feedingTime, user?.timezone)}\n`;
        }
        updateMessage += `📝 Детали: ${parsed.details}\n`;
        updateMessage += `👤 Кто: ${user?.username || 'Пользователь'}`;

        // Уведомляем всех пользователей об обновлении
        const allUsers = await ctx.database.getAllUsers();
        for (const u of allUsers) {
            if (u.notificationsEnabled) {
                try {
                    await ctx.telegram.sendMessage(
                        u.telegramId,
                        `📝 ${updateMessage}`
                    );
                } catch (error) {
                    console.error(
                        `Ошибка отправки уведомления пользователю ${u.telegramId}:`,
                        error
                    );
                }
            }
        }

        // НЕ очищаем ID кормления из сессии, чтобы можно было редактировать снова
        // ID будет обновлен при следующем кормлении

        // Возврат на главный экран
        setTimeout(() => {
            ctx.scene.enter(SCENES.MAIN);
        }, 2000);
    } catch (error) {
        console.error('Ошибка обновления деталей кормления:', error);
        ctx.reply(
            MessageFormatter.error('Произошла ошибка при сохранении деталей. ' + UI_TEXTS.common.tryAgain),
            getHomeKeyboard()
        );
    }
});
