export type BotMode = 'polling' | 'webhook';

export function resolveBotMode(
    nodeEnvironment: string,
    configuredMode?: string
): BotMode {
    if (configuredMode === undefined || configuredMode.trim() === '') {
        return nodeEnvironment === 'production' ? 'webhook' : 'polling';
    }

    const normalizedMode = configuredMode.trim().toLowerCase();
    if (normalizedMode === 'polling' || normalizedMode === 'webhook') {
        return normalizedMode;
    }

    throw new Error(
        `Некорректный BOT_MODE: ${configuredMode}. Допустимые значения: polling, webhook`
    );
}
