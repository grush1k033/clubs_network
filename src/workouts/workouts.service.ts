import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkoutsService {
    constructor(private prisma: PrismaService) {}

    // Получить тренировки по клубу (только будущие)
    async getByClub(clubId: number) {
        return this.prisma.workout.findMany({
            where: {
                clubId,
                startTime: { gte: new Date() },
            },
            include: {
                trainer: {
                    select: { name: true }
                },
                attendance: {
                    select: { userId: true }
                }
            },
            orderBy: { startTime: 'asc' },
        });
    }

    // Записаться на тренировку
    async book(userId: number, workoutId: number) {
        const workout = await this.prisma.workout.findUnique({
            where: { id: workoutId },
        });

        if (!workout) {
            throw new BadRequestException('Тренировка не найдена');
        }

        if (workout.startTime < new Date()) {
            throw new BadRequestException('Нельзя записаться на прошедшую тренировку');
        }

        if (workout.currentParticipants >= workout.maxParticipants) {
            throw new BadRequestException('Нет свободных мест');
        }

        const existing = await this.prisma.attendance.findFirst({
            where: { workoutId, userId },
        });

        if (existing) {
            throw new BadRequestException('Вы уже записаны на эту тренировку');
        }

        return this.prisma.$transaction([
            this.prisma.workout.update({
                where: { id: workoutId },
                data: { currentParticipants: { increment: 1 } },
            }),
            this.prisma.attendance.create({
                data: {
                    workoutId,
                    userId,
                    status: 'registered',
                },
            }),
        ]);
    }

    // Отменить запись
    async cancel(userId: number, workoutId: number) {
        const attendance = await this.prisma.attendance.findFirst({
            where: { workoutId, userId },
        });

        if (!attendance) {
            throw new BadRequestException('Вы не записаны на эту тренировку');
        }

        const workout = await this.prisma.workout.findUnique({
            where: { id: workoutId },
        });

        if (!workout) {
            throw new BadRequestException('Тренировка не найдена');
        }

        if (workout.startTime < new Date()) {
            throw new BadRequestException('Нельзя отменить запись на прошедшую тренировку');
        }

        return this.prisma.$transaction([
            this.prisma.workout.update({
                where: { id: workoutId },
                data: { currentParticipants: { decrement: 1 } },
            }),
            this.prisma.attendance.delete({
                where: { id: attendance.id },
            }),
        ]);
    }
}