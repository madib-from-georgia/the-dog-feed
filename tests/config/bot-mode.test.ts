import { resolveBotMode } from '../../src/config/bot-mode';

describe('resolveBotMode', () => {
    it('keeps webhook as the production default', () => {
        expect(resolveBotMode('production')).toBe('webhook');
    });

    it('keeps polling as the development default', () => {
        expect(resolveBotMode('development')).toBe('polling');
    });

    it('allows polling with the production environment', () => {
        expect(resolveBotMode('production', 'polling')).toBe('polling');
    });

    it('normalizes an explicitly configured mode', () => {
        expect(resolveBotMode('production', ' WEBHOOK ')).toBe('webhook');
    });

    it('rejects an unknown mode', () => {
        expect(() => resolveBotMode('production', 'push')).toThrow(
            'Некорректный BOT_MODE'
        );
    });
});
