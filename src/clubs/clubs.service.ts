import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Injectable()
export class ClubsService {
    constructor(private prisma: PrismaService) {}

    // Создание клуба
    async create(dto: CreateClubDto) {
        return this.prisma.club.create({
            data: dto,
        });
    }

    // Получение всех клубов
    async findAll() {
        return this.prisma.club.findMany();
    }

    // Получение одного клуба по id
    async findOne(id: number) {
        const club = await this.prisma.club.findUnique({
            where: { id },
        });

        if (!club) {
            throw new NotFoundException(`Клуб с ID ${id} не найден`);
        }

        return club;
    }

    // Обновление клуба
    async update(id: number, dto: UpdateClubDto) {
        await this.findOne(id); // проверяем, что клуб существует

        return this.prisma.club.update({
            where: { id },
            data: dto,
        });
    }

    // Удаление клуба
    async remove(id: number) {
        await this.findOne(id);

        return this.prisma.club.delete({
            where: { id },
        });
    }
}