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

    async getBestSellingTariffs(clubId?: number) {
        const where: any = { type: 'payment' };
        if (clubId) {
            where.clubId = clubId;
        }

        const purchases = await this.prisma.transaction.groupBy({
            by: ['tariffId', 'clubId'],
            where,
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
        });

        const tariffIds = purchases.map(p => p.tariffId).filter(id => id !== null);
        const tariffs = await this.prisma.tariff.findMany({
            where: { id: { in: tariffIds as number[] } },
            select: { id: true, name: true, clubId: true },
        });

        const clubs = await this.prisma.club.findMany({
            where: { id: { in: purchases.map(p => p.clubId) } },
            select: { id: true, name: true },
        });

        const totalCount = purchases.reduce((sum, p) => sum + p._count.id, 0);

        const result = purchases.map(p => {
            const tariff = tariffs.find(t => t.id === p.tariffId);
            const club = clubs.find(c => c.id === p.clubId);
            return {
                tariff_name: tariff?.name || 'Неизвестный тариф',
                club_name: club?.name || 'Неизвестный клуб',
                purchases: p._count.id,
                percentage: Math.round((p._count.id / totalCount) * 100),
            };
        });

        return result;
    }

    async getTopClubs(limit: number = 5) {
        const result = await this.prisma.$queryRaw`
            WITH club_revenue AS (
                SELECT
                    club_id,
                    SUM(amount) as revenue
                FROM transactions
                WHERE type = 'deposit'
                GROUP BY club_id
            ),
                 club_members AS (
                     SELECT
                         club_id,
                         COUNT(*) as members
                     FROM users
                     GROUP BY club_id
                 )
            SELECT
                c.id,
                c.name,
                COALESCE(cm.members, 0) as members,
                COALESCE(cr.revenue, 0) as revenue
            FROM clubs c
                     LEFT JOIN club_members cm ON cm.club_id = c.id
                     LEFT JOIN club_revenue cr ON cr.club_id = c.id
            ORDER BY revenue DESC
                LIMIT ${limit}
        `;

        return (result as any[]).map((club: any) => ({
            id: Number(club.id),
            name: club.name,
            members: Number(club.members),
            revenue: Number(club.revenue)
        }));
    }
}