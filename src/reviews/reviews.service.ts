import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
    constructor(private prisma: PrismaService) {}

    async create(userId: number, dto: CreateReviewDto) {
        // Проверяем, существует ли клуб
        const club = await this.prisma.club.findUnique({
            where: { id: dto.clubId },
        });
        if (!club) {
            throw new NotFoundException('Клуб не найден');
        }

        // Проверяем, может ли пользователь оставить отзыв (должен быть member этого клуба)
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (user?.clubId !== dto.clubId || user?.role !== 'member') {
            throw new BadRequestException('Вы можете оставить отзыв только о клубе, в котором состоите');
        }

        // Создаём отзыв (сразу одобрен)
        return this.prisma.review.create({
            data: {
                userId,
                clubId: dto.clubId,
                rating: dto.rating,
                comment: dto.comment,
                isModerated: true,
            },
            include: {
                user: {
                    select: { id: true, name: true },
                },
            },
        });
    }

    async findByClub(clubId: number) {
        const club = await this.prisma.club.findUnique({
            where: { id: clubId },
        });
        if (!club) {
            throw new NotFoundException('Клуб не найден');
        }

        return this.prisma.review.findMany({
            where: { clubId },
            include: {
                user: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async delete(reviewId: number, userId: number, isSuperAdmin: boolean) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
        });
        if (!review) {
            throw new NotFoundException('Отзыв не найден');
        }

        // Проверка прав: автор отзыва, админ клуба или суперадмин
        const isAuthor = review.userId === userId;

        if (!isSuperAdmin && !isAuthor) {
            // Проверяем, является ли пользователь админом этого клуба
            const clubAdmin = await this.prisma.club.findFirst({
                where: {
                    id: review.clubId,
                    users: { some: { id: userId, role: 'club_admin' } },
                },
            });
            if (!clubAdmin) {
                throw new BadRequestException('У вас нет прав на удаление этого отзыва');
            }
        }

        return this.prisma.review.delete({ where: { id: reviewId } });
    }
}