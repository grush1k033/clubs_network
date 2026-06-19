import { Injectable } from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";

@Injectable()
export class AttendanceService {
    constructor(private prisma: PrismaService) {}
    async findByUserId(userId: number) {
        return this.prisma.attendance.findMany({
            where: { userId },
            include: {
                workout: {
                    select: {
                        id: true,
                        title: true,
                        startTime: true,
                        endTime: true,
                        club: {
                            select: { name: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getUpcomingByUserId(userId: number) {
        return this.prisma.attendance.findMany({
            where: {
                userId,
                workout: {
                    startTime: { gte: new Date() },
                    status: { not: 'cancelled' }
                }
            },
            include: {
                workout: {
                    include: {
                        club: true,
                        trainer: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                workout: {
                    startTime: 'asc'
                }
            }
        });
    }
}
