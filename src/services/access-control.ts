import * as fs from 'fs';
import * as path from 'path';

/**
 * Сервис для управления доступом пользователей к боту
 */
export class AccessControlService {
    private allowedUsersFile: string;
    private allowedUsers: Set<number> = new Set();

    constructor(allowedUsersFilePath?: string) {
        this.allowedUsersFile = allowedUsersFilePath || path.join(process.cwd(), 'allowed-users.txt');
        this.loadAllowedUsers();
    }

    /**
     * Загружает список разрешенных пользователей из файла
     */
    private loadAllowedUsers(): void {
        try {
            if (fs.existsSync(this.allowedUsersFile)) {
                const content = fs.readFileSync(this.allowedUsersFile, 'utf-8');
                const userIds = content
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#')) // Игнорируем пустые строки и комментарии
                    .map(line => parseInt(line, 10))
                    .filter(id => !isNaN(id));

                this.allowedUsers = new Set(userIds);
                console.log(`Загружено ${this.allowedUsers.size} разрешенных пользователей из ${this.allowedUsersFile}`);
            } else {
                console.warn(`Файл разрешенных пользователей не найден: ${this.allowedUsersFile}`);
                console.warn('Создайте файл allowed-users.txt в корне проекта с ID разрешенных пользователей');
            }
        } catch (error) {
            console.error('Ошибка при загрузке списка разрешенных пользователей:', error);
        }
    }

    /**
     * Проверяет, разрешен ли доступ пользователю
     */
    public isUserAllowed(userId: number): boolean {
        return this.allowedUsers.has(userId);
    }

    /**
     * Добавляет пользователя в список разрешенных
     */
    public addUser(userId: number): void {
        this.allowedUsers.add(userId);
        this.saveAllowedUsers();
    }

    /**
     * Удаляет пользователя из списка разрешенных
     */
    public removeUser(userId: number): void {
        this.allowedUsers.delete(userId);
        this.saveAllowedUsers();
    }

    /**
     * Получает список всех разрешенных пользователей
     */
    public getAllowedUsers(): number[] {
        return Array.from(this.allowedUsers);
    }

    /**
     * Перезагружает список разрешенных пользователей из файла
     */
    public reloadAllowedUsers(): void {
        this.loadAllowedUsers();
    }

    /**
     * Сохраняет текущий список разрешенных пользователей в файл
     */
    private saveAllowedUsers(): void {
        try {
            const content = Array.from(this.allowedUsers)
                .sort((a, b) => a - b)
                .join('\n');
            fs.writeFileSync(this.allowedUsersFile, content, 'utf-8');
            console.log(`Список разрешенных пользователей сохранен в ${this.allowedUsersFile}`);
        } catch (error) {
            console.error('Ошибка при сохранении списка разрешенных пользователей:', error);
        }
    }

    /**
     * Получает количество разрешенных пользователей
     */
    public getAllowedUsersCount(): number {
        return this.allowedUsers.size;
    }
}