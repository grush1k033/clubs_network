import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super();
    }

    async onModuleInit() {
        try {
            this.logger.log('Попытка подключения к базе данных...');
            await this.$connect();
            this.logger.log('Успешно подключено к базе данных');
        } catch (error) {
            this.logger.error('Ошибка подключения:', error.message);
            throw error;
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log(' Отключено от базы данных');
    }
}