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

    async getRevenueByMonth(clubId?: number) {
        const where: any = { type: 'deposit' };
        if (clubId) {
            where.clubId = clubId;
        }

        const transactions = await this.prisma.transaction.findMany({
            where,
            select: {
                amount: true,
                createdAt: true,
            },
        });

        // Группируем по месяцам (последние 6 месяцев)
        const months: Record<string, number> = {};
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            months[key] = 0;
        }

        for (const tx of transactions) {
            const date = new Date(tx.createdAt);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (months[key] !== undefined) {
                months[key] += tx.amount;
            }
        }

        return Object.entries(months).map(([month, revenue]) => ({
            month,
            revenue,
        }));
    }
}