import { DatabaseService } from '../services/database';
import { TimerService } from '../services/timer';
import { SchedulerService } from '../services/scheduler';
import { Telegraf } from 'telegraf';
import { BotContext } from '../types';

/**
 * Интерфейс зависимостей для сцен
 * Все сервисы передаются через DI вместо глобальных переменных
 */
export interface SceneDependencies {
    bot: Telegraf<BotContext>;
    database: DatabaseService;
    timerService: TimerService;
    schedulerService: SchedulerService;
}

/**
 * Базовый интерфейс для всех сцен с зависимостями
 */
export interface SceneWithDependencies {
    setDependencies(deps: SceneDependencies): void;
}
