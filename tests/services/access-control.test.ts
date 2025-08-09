import { AccessControlService } from '../../src/services/access-control';
import * as fs from 'fs';
import * as path from 'path';

describe('AccessControlService', () => {
    let accessControl: AccessControlService;
    let testFilePath: string;

    beforeEach(() => {
        // Создаем временный файл для тестов
        testFilePath = path.join(__dirname, 'test-allowed-users.txt');
        fs.writeFileSync(testFilePath, '123456\n789012\n345678', 'utf-8');
        accessControl = new AccessControlService(testFilePath);
    });

    afterEach(() => {
        // Удаляем временный файл после каждого теста
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });

    describe('isUserAllowed', () => {
        it('должен возвращать true для разрешенного пользователя', () => {
            expect(accessControl.isUserAllowed(123456)).toBe(true);
            expect(accessControl.isUserAllowed(789012)).toBe(true);
            expect(accessControl.isUserAllowed(345678)).toBe(true);
        });

        it('должен возвращать false для неразрешенного пользователя', () => {
            expect(accessControl.isUserAllowed(999999)).toBe(false);
            expect(accessControl.isUserAllowed(111111)).toBe(false);
        });
    });

    describe('addUser', () => {
        it('должен добавлять нового пользователя', () => {
            const newUserId = 555555;
            expect(accessControl.isUserAllowed(newUserId)).toBe(false);
            
            accessControl.addUser(newUserId);
            
            expect(accessControl.isUserAllowed(newUserId)).toBe(true);
            expect(accessControl.getAllowedUsers()).toContain(newUserId);
        });

        it('должен сохранять изменения в файл', () => {
            const newUserId = 666666;
            accessControl.addUser(newUserId);
            
            // Создаем новый экземпляр для проверки сохранения
            const newAccessControl = new AccessControlService(testFilePath);
            expect(newAccessControl.isUserAllowed(newUserId)).toBe(true);
        });
    });

    describe('removeUser', () => {
        it('должен удалять существующего пользователя', () => {
            const userId = 123456;
            expect(accessControl.isUserAllowed(userId)).toBe(true);
            
            accessControl.removeUser(userId);
            
            expect(accessControl.isUserAllowed(userId)).toBe(false);
            expect(accessControl.getAllowedUsers()).not.toContain(userId);
        });

        it('должен сохранять изменения в файл', () => {
            const userId = 789012;
            accessControl.removeUser(userId);
            
            // Создаем новый экземпляр для проверки сохранения
            const newAccessControl = new AccessControlService(testFilePath);
            expect(newAccessControl.isUserAllowed(userId)).toBe(false);
        });
    });

    describe('getAllowedUsers', () => {
        it('должен возвращать список всех разрешенных пользователей', () => {
            const allowedUsers = accessControl.getAllowedUsers();
            expect(allowedUsers).toEqual(expect.arrayContaining([123456, 789012, 345678]));
            expect(allowedUsers).toHaveLength(3);
        });
    });

    describe('getAllowedUsersCount', () => {
        it('должен возвращать количество разрешенных пользователей', () => {
            expect(accessControl.getAllowedUsersCount()).toBe(3);
            
            accessControl.addUser(999999);
            expect(accessControl.getAllowedUsersCount()).toBe(4);
            
            accessControl.removeUser(123456);
            expect(accessControl.getAllowedUsersCount()).toBe(3);
        });
    });

    describe('reloadAllowedUsers', () => {
        it('должен перезагружать список из файла', () => {
            // Добавляем пользователя в память
            accessControl.addUser(777777);
            expect(accessControl.isUserAllowed(777777)).toBe(true);
            
            // Изменяем файл напрямую (имитируем внешнее изменение)
            fs.writeFileSync(testFilePath, '123456\n789012\n888888', 'utf-8');
            
            // Перезагружаем
            accessControl.reloadAllowedUsers();
            
            // Проверяем, что изменения применились
            expect(accessControl.isUserAllowed(777777)).toBe(false); // Удален из памяти
            expect(accessControl.isUserAllowed(888888)).toBe(true);  // Добавлен из файла
            expect(accessControl.isUserAllowed(345678)).toBe(false); // Удален из файла
        });
    });

    describe('обработка файла с комментариями и пустыми строками', () => {
        it('должен игнорировать комментарии и пустые строки', () => {
            const fileContent = `# Это комментарий
123456

# Еще один комментарий
789012
# Комментарий в конце
`;
            fs.writeFileSync(testFilePath, fileContent, 'utf-8');
            
            const newAccessControl = new AccessControlService(testFilePath);
            
            expect(newAccessControl.getAllowedUsersCount()).toBe(2);
            expect(newAccessControl.isUserAllowed(123456)).toBe(true);
            expect(newAccessControl.isUserAllowed(789012)).toBe(true);
        });
    });

    describe('обработка несуществующего файла', () => {
        it('должен корректно обрабатывать отсутствие файла', () => {
            const nonExistentPath = path.join(__dirname, 'non-existent-file.txt');
            const newAccessControl = new AccessControlService(nonExistentPath);
            
            expect(newAccessControl.getAllowedUsersCount()).toBe(0);
            expect(newAccessControl.isUserAllowed(123456)).toBe(false);
        });
    });
});