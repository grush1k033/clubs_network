import { Injectable } from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";

@Injectable()
export class TransactionsService {

    constructor(private prisma: PrismaService) {}
    async findByUserId(userId: number) {
        return this.prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
