import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@Injectable()
export class TariffsService {
    constructor(private prisma: PrismaService) {}

    // Создание тарифа для конкретного клуба
    async create(clubId: number, dto: CreateTariffDto) {
        // Проверяем, существует ли клуб
        const club = await this.prisma.club.findUnique({
            where: { id: clubId },
        });

        if (!club) {
            throw new NotFoundException(`Клуб с ID ${clubId} не найден`);
        }

        return this.prisma.tariff.create({
            data: {
                ...dto,
                clubId,
            },
        });
    }

    // Все тарифы конкретного клуба
    async findAllByClub(clubId: number) {
        return this.prisma.tariff.findMany({
            where: { clubId },
        });
    }

    // Один тариф по ID
    async findOne(id: number) {
        const tariff = await this.prisma.tariff.findUnique({
            where: { id },
        });

        if (!tariff) {
            throw new NotFoundException(`Тариф с ID ${id} не найден`);
        }

        return tariff;
    }

    // Обновление тарифа
    async update(id: number, dto: UpdateTariffDto) {
        await this.findOne(id); // проверяем существование

        return this.prisma.tariff.update({
            where: { id },
            data: dto,
        });
    }

    // Удаление тарифа
    async remove(id: number) {
        await this.findOne(id);

        // Проверяем, не купил ли кто-то этот тариф
        const usersWithTariff = await this.prisma.user.count({
            where: { tariffId: id },
        });

        if (usersWithTariff > 0) {
            throw new BadRequestException(
                'Нельзя удалить тариф — он уже куплен пользователями',
            );
        }

        return this.prisma.tariff.delete({
            where: { id },
        });
    }
}