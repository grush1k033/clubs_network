import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) {}

    async getStats(clubId?: number) {
        const whereClub = clubId ? { clubId } : {};
        const whereTransaction = clubId ? { clubId } : {};

        // Количество клубов
        const clubsCount = await this.prisma.club.count();

        // Количество пользователей
        const usersCount = await this.prisma.user.count({
            where: clubId ? { clubId } : {},
        });

        // Количество транзакций
        const transactionsCount = await this.prisma.transaction.count({
            where: whereTransaction,
        });

        // Общая выручка (сумма всех пополнений)
        const totalRevenue = await this.prisma.transaction.aggregate({
            where: {
                type: 'deposit',
                ...(clubId ? { clubId } : {}),
            },
            _sum: { amount: true },
        });

        return {
            clubs: clubId ? 1 : clubsCount,
            users: usersCount,
            transactions: transactionsCount,
            revenue: totalRevenue._sum.amount || 0,
        };
    }
}