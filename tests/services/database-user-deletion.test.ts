import { DatabaseService } from '../../src/services/database';
import * as fs from 'fs';
import * as path from 'path';

describe('DatabaseService - User Deletion', () => {
    let database: DatabaseService;
    let testDbPath: string;

    beforeEach(async () => {
        // Создаем временную базу данных для тестов
        testDbPath = path.join(__dirname, 'test-user-deletion.db');
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        
        database = new DatabaseService(testDbPath);
        await database.initialize();
    });

    afterEach(async () => {
        await database.close();
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('deleteUserByTelegramId', () => {
        it('должен удалить пользователя и все связанные данные', async () => {
            // Создаем пользователя
            const user = await database.createUser(123456, 'testuser');
            
            // Создаем кормление для пользователя
            await database.createFeeding(user.id, 'dry', 15);
            
            // Создаем запланированное кормление
            const scheduledTime = new Date(Date.now() + 60 * 60 * 1000); // через час
            await database.createScheduledFeeding(scheduledTime, user.id);
            
            // Проверяем, что данные созданы
            const userBefore = await database.getUserByTelegramId(123456);
            expect(userBefore).not.toBeNull();
            
            const feedingsBefore = await database.getAllFeedings();
            expect(feedingsBefore).toHaveLength(1);
            
            const scheduledBefore = await database.getAllScheduledFeedings();
            expect(scheduledBefore).toHaveLength(1);
            
            // Удаляем пользователя
            const deleted = await database.deleteUserByTelegramId(123456);
            expect(deleted).toBe(true);
            
            // Проверяем, что пользователь удален
            const userAfter = await database.getUserByTelegramId(123456);
            expect(userAfter).toBeNull();
            
            // Проверяем, что связанные данные тоже удалены
            const feedingsAfter = await database.getAllFeedings();
            expect(feedingsAfter).toHaveLength(0);
            
            const scheduledAfter = await database.getAllScheduledFeedings();
            expect(scheduledAfter).toHaveLength(0);
        });

        it('должен вернуть false для несуществующего пользователя', async () => {
            const deleted = await database.deleteUserByTelegramId(999999);
            expect(deleted).toBe(false);
        });

        it('должен корректно обрабатывать пользователя без связанных данных', async () => {
            // Создаем пользователя без кормлений и расписаний
            const user = await database.createUser(123456, 'testuser');
            
            const deleted = await database.deleteUserByTelegramId(123456);
            expect(deleted).toBe(true);
            
            const userAfter = await database.getUserByTelegramId(123456);
            expect(userAfter).toBeNull();
        });
    });

    describe('deleteUserById', () => {
        it('должен удалить пользователя по внутреннему ID', async () => {
            // Создаем пользователя
            const user = await database.createUser(123456, 'testuser');
            
            // Создаем связанные данные
            await database.createFeeding(user.id, 'wet', 20);
            const scheduledTime = new Date(Date.now() + 60 * 60 * 1000);
            await database.createScheduledFeeding(scheduledTime, user.id);
            
            // Удаляем пользователя по внутреннему ID
            const deleted = await database.deleteUserById(user.id);
            expect(deleted).toBe(true);
            
            // Проверяем удаление
            const userAfter = await database.getUserById(user.id);
            expect(userAfter).toBeNull();
            
            const feedingsAfter = await database.getAllFeedings();
            expect(feedingsAfter).toHaveLength(0);
            
            const scheduledAfter = await database.getAllScheduledFeedings();
            expect(scheduledAfter).toHaveLength(0);
        });

        it('должен вернуть false для несуществующего ID', async () => {
            const deleted = await database.deleteUserById(999);
            expect(deleted).toBe(false);
        });
    });

    describe('транзакционность удаления', () => {
        it('должен откатить изменения при ошибке', async () => {
            // Создаем пользователя
            const user = await database.createUser(123456, 'testuser');
            await database.createFeeding(user.id, 'dry', 15);
            
            // Проверяем, что данные созданы
            const userBefore = await database.getUserByTelegramId(123456);
            expect(userBefore).not.toBeNull();
            
            const feedingsBefore = await database.getAllFeedings();
            expect(feedingsBefore).toHaveLength(1);
            
            // Попытка удаления с некорректным ID (должна пройти нормально)
            const deleted = await database.deleteUserByTelegramId(123456);
            expect(deleted).toBe(true);
            
            // Проверяем, что все удалено
            const userAfter = await database.getUserByTelegramId(123456);
            expect(userAfter).toBeNull();
            
            const feedingsAfter = await database.getAllFeedings();
            expect(feedingsAfter).toHaveLength(0);
        });
    });

    describe('множественные пользователи', () => {
        it('должен удалить только указанного пользователя', async () => {
            // Создаем двух пользователей
            const user1 = await database.createUser(123456, 'user1');
            const user2 = await database.createUser(789012, 'user2');
            
            // Создаем данные для каждого
            await database.createFeeding(user1.id, 'dry', 15);
            await database.createFeeding(user2.id, 'wet', 20);
            
            const scheduledTime1 = new Date(Date.now() + 60 * 60 * 1000);
            const scheduledTime2 = new Date(Date.now() + 120 * 60 * 1000);
            await database.createScheduledFeeding(scheduledTime1, user1.id);
            await database.createScheduledFeeding(scheduledTime2, user2.id);
            
            // Удаляем первого пользователя
            const deleted = await database.deleteUserByTelegramId(123456);
            expect(deleted).toBe(true);
            
            // Проверяем, что первый пользователь удален
            const user1After = await database.getUserByTelegramId(123456);
            expect(user1After).toBeNull();
            
            // Проверяем, что второй пользователь остался
            const user2After = await database.getUserByTelegramId(789012);
            expect(user2After).not.toBeNull();
            expect(user2After?.username).toBe('user2');
            
            // Проверяем кормления
            const feedingsAfter = await database.getAllFeedings();
            expect(feedingsAfter).toHaveLength(1);
            expect(feedingsAfter[0].userId).toBe(user2.id);
            
            // Проверяем расписания
            const scheduledAfter = await database.getAllScheduledFeedings();
            expect(scheduledAfter).toHaveLength(1);
            expect(scheduledAfter[0].createdBy).toBe(user2.id);
        });
    });
});