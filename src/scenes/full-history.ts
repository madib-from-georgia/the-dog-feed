import { Scenes } from 'telegraf';
import { BotContext } from '../types';
import { getPaginationKeyboard } from '../utils/keyboards';
import { SCENES, EXPORT_SETTINGS } from '../utils/constants';
import { ScheduledFeeding } from '../services/scheduler';
import { formatDateTime } from '../utils/time-utils';
import { createUserLink } from '../utils/user-utils';
import { registerCommonNavigationHandlers } from '../ui/navigation';
import { UI_TEXTS } from '../ui/messages';

export const fullHistoryScene = new Scenes.BaseScene<BotContext>(
    SCENES.FULL_HISTORY
);

// Регистрируем общие обработчики навигации
registerCommonNavigationHandlers(fullHistoryScene, {
    hasBackButton: true,
    backTo: SCENES.HISTORY
});

// Вход в сцену полной истории
fullHistoryScene.enter(async ctx => {
    // Инициализируем данные сессии
    ctx.session.fullHistory = {
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0,
        period: 'all',
    };

    await showHistoryPage(ctx, 1);
});

// Функция для отображения страницы истории
async function showHistoryPage(ctx: BotContext, page: number) {
    try {
        ctx.reply(UI_TEXTS.history.loading);

        const limit = EXPORT_SETTINGS.RECORDS_PER_PAGE;
        const offset = (page - 1) * limit;

        // Получаем общее количество записей
        const totalRecords = await ctx.database.getTotalFeedingsCount();
        const totalPages = Math.ceil(totalRecords / limit);

        // Получаем кормления для текущей страницы
        const feedings = await ctx.database.getFeedingsWithPagination(
            page,
            limit
        );

        // Обновляем данные сессии
        ctx.session.fullHistory = {
            currentPage: page,
            totalPages,
            totalRecords,
            period: ctx.session.fullHistory?.period || 'all',
        };

        if (feedings.length === 0) {
            ctx.reply(
                UI_TEXTS.history.noFeedings,
                getPaginationKeyboard(page, totalPages, false, false)
            );
            return;
        }

        // Формируем сообщение с историей
        let message = `${UI_TEXTS.history.fullHeader}\n\n`;

        // Получаем запланированные кормления
        if (ctx.schedulerService) {
            try {
                const scheduledFeedings: ScheduledFeeding[] =
                    await ctx.schedulerService.getActiveScheduledFeedings();
                const now = new Date();

                // Фильтруем только будущие кормления
                const futureFeedings: ScheduledFeeding[] =
                    scheduledFeedings.filter(
                        (schedule: ScheduledFeeding) =>
                            schedule.scheduledTime > now
                    );

                if (futureFeedings.length > 0) {
                    message += `📅 Следующие запланированные кормления:\n`;

                    // Сортируем по времени
                    futureFeedings.sort(
                        (a: ScheduledFeeding, b: ScheduledFeeding) =>
                            a.scheduledTime.getTime() -
                            b.scheduledTime.getTime()
                    );

                    // Показываем максимум 3 ближайших кормления
                    const displayFeedings = futureFeedings.slice(0, 3);

                    for (const schedule of displayFeedings) {
                        const user = await ctx.database.getUserById(
                            schedule.createdBy
                        );
                        const username = createUserLink(user);

                        const scheduledTime = formatDateTime(
                            schedule.scheduledTime,
                            user?.timezone
                        );

                        // Рассчитываем время до кормления
                        const timeUntil =
                            schedule.scheduledTime.getTime() - now.getTime();
                        const timeHours = Math.floor(
                            timeUntil / (1000 * 60 * 60)
                        );
                        const timeMinutes = Math.floor(
                            (timeUntil % (1000 * 60 * 60)) / (1000 * 60)
                        );

                        let timeUntilText = '';
                        if (timeHours > 0) {
                            timeUntilText = `через ${timeHours} ч ${timeMinutes} мин`;
                        } else {
                            timeUntilText = `через ${timeMinutes} мин`;
                        }

                        message += `⏰ ${scheduledTime} (${timeUntilText}) - ${username}\n`;
                    }

                    if (futureFeedings.length > 3) {
                        message += `... и еще ${futureFeedings.length - 3} кормлений\n`;
                    }

                    message += '\n';
                }
            } catch (error) {
                console.error(
                    'Ошибка при получении запланированных кормлений:',
                    error
                );
            }
        }

        // Добавляем статистику
        message += `${UI_TEXTS.status.statistics}\n`;
        message += `📊 Всего записей: ${totalRecords}\n`;
        message += `📄 Страница: ${page} из ${totalPages}\n\n`;

        // Добавляем записи кормлений
        for (const feeding of feedings) {
            const user = await ctx.database.getUserById(feeding.userId);
            const username = createUserLink(user);

            const dateTime = formatDateTime(feeding.timestamp, user?.timezone);

            const foodTypeIcon = feeding.foodType === 'dry' ? '🌾' : '🥫';
            const foodTypeText =
                feeding.foodType === 'dry' ? 'Сухой' : 'Влажный';

            // Форматируем запись в соответствии с запросом пользователя
            const foodTypeRussian =
                feeding.foodType === 'dry' ? 'сухого' : 'мокрого';
            message += `📅 ${dateTime}\n`;
            message += `   ${username} дал ${feeding.amount} грамм ${foodTypeRussian}\n`;

            if (feeding.details) {
                message += `📝 ${feeding.details}\n`;
            }

            message += '\n';
        }

        // Проверяем, есть ли следующая/предыдущая страница
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        ctx.reply(
            message,
            getPaginationKeyboard(page, totalPages, hasNext, hasPrev)
        );
    } catch (error) {
        console.error('Ошибка при загрузке истории:', error);
        ctx.reply(
            `❌ Произошла ошибка при загрузке истории. ${UI_TEXTS.common.tryAgain}`,
            getPaginationKeyboard(1, 1, false, false)
        );
    }
}

// Обработка навигации по страницам
fullHistoryScene.hears(/◀️ Предыдущая/, async ctx => {
    const currentPage = ctx.session.fullHistory?.currentPage || 1;
    if (currentPage > 1) {
        await showHistoryPage(ctx, currentPage - 1);
    }
});

fullHistoryScene.hears(/▶️ Следующая/, async ctx => {
    const currentPage = ctx.session.fullHistory?.currentPage || 1;
    const totalPages = ctx.session.fullHistory?.totalPages || 1;

    if (currentPage < totalPages) {
        await showHistoryPage(ctx, currentPage + 1);
    }
});

// Обработка экспорта истории
fullHistoryScene.hears(/📤 Экспорт истории/, ctx => {
    ctx.scene.enter(SCENES.EXPORT);
});

// Обработка фильтров (заглушка для будущего расширения)
fullHistoryScene.hears(/🔍 Фильтры/, ctx => {
    ctx.reply(
        `🔍 Фильтры\n\n${UI_TEXTS.common.notImplemented}\nПока доступна фильтрация по периодам при экспорте.`,
        getPaginationKeyboard(
            ctx.session.fullHistory?.currentPage || 1,
            ctx.session.fullHistory?.totalPages || 1,
            false,
            false
        )
    );
});

// Обработка информации о странице (не делаем ничего)
fullHistoryScene.hears(/📄 Страница \d+ из \d+/, ctx => {
    // Ничего не делаем, это просто информационная кнопка
});

// Обработка неизвестных команд
fullHistoryScene.on('text', ctx => {
    const text = (ctx.message as any)?.text || '';

    // Пропускаем команды и навигационные кнопки
    if (text.startsWith('/') || text.includes('🏠') || text.includes('⬅️')) {
        return;
    }

    const currentPage = ctx.session.fullHistory?.currentPage || 1;
    const totalPages = ctx.session.fullHistory?.totalPages || 1;
    const hasNext = currentPage < totalPages;
    const hasPrev = currentPage > 1;

    ctx.reply(
        UI_TEXTS.navigation.useButtons,
        getPaginationKeyboard(currentPage, totalPages, hasNext, hasPrev)
    );
});
