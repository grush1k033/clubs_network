import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronService {
    private readonly logger = new Logger(CronService.name);

    constructor(private prisma: PrismaService) {}

    // Запускаем каждые 2 часа
    @Cron('0 */2 * * *')
    async cleanupUnverifiedUsers() {
        this.logger.log('🧹 Запуск очистки неподтверждённых пользователей...');

        try {
            const result = await this.prisma.user.deleteMany({
                where: {
                    emailVerified: false,
                    createdAt: {
                        lt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 24 часа назад
                    },
                },
            });

            if (result.count > 0) {
                this.logger.log(`✅ Удалено ${result.count} пользователей`);
            } else {
                this.logger.log('⏳ Нет пользователей для удаления');
            }
        } catch (error) {
            this.logger.error('❌ Ошибка при очистке:', error);
        }
    }
}