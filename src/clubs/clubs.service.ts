import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Injectable()
export class ClubsService {
    constructor(
        private prisma: PrismaService,
        private uploadService: UploadService,
    ) {}

    // Создание клуба (с возможным логотипом)
    async create(dto: CreateClubDto, file?: Express.Multer.File) {
        let logoUrl: string | undefined;

        if (file) {
            logoUrl = await this.uploadService.uploadImage(file, 'clubs-logos');
        }

        try {
            return await this.prisma.club.create({
                data: {
                    ...dto,
                    logo: logoUrl || dto.logo,
                },
            });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new ConflictException('Клуб с таким названием уже существует');
            }
            throw error;
        }
    }

    // Получение всех клубов
    async findAll() {
        return this.prisma.club.findMany();
    }

    // Получение одного клуба по id (с пользователями)
    async findOne(id: number) {
        const club = await this.prisma.club.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });

        if (!club) {
            throw new NotFoundException(`Клуб с ID ${id} не найден`);
        }

        return club;
    }

    // Обновление клуба (с возможной заменой логотипа)
    async update(id: number, dto: UpdateClubDto, file?: Express.Multer.File) {
        await this.findOne(id);

        let logoUrl: string | undefined;

        if (file) {
            const oldClub = await this.findOne(id);
            if (oldClub.logo) {
                const publicId = this.uploadService.extractPublicIdFromUrl(oldClub.logo);
                if (publicId) {
                    await this.uploadService.deleteImage(publicId).catch(() => {});
                }
            }

            logoUrl = await this.uploadService.uploadImage(file, `club-${id}`);
        }

        return this.prisma.club.update({
            where: { id },
            data: {
                ...dto,
                logo: logoUrl || dto.logo,
            },
        });
    }

    // Удаление клуба
    async remove(id: number) {
        const club = await this.findOne(id);

        // 1. Отвязываем всех пользователей от клуба
        await this.prisma.user.updateMany({
            where: { clubId: id },
            data: {
                clubId: null,
                tariffId: null, // сбрасываем тариф
                startDate: null,
                endDate: null,
                paid: false,
                paidAt: null,
                // Для сотрудников тоже сбрасываем поля
                position: null,
                hiredAt: null,
            },
        });

        // 2. Удаляем логотип из Cloudinary
        if (club.logo) {
            const publicId = this.uploadService.extractPublicIdFromUrl(club.logo);
            if (publicId) {
                await this.uploadService.deleteImage(publicId).catch(() => {});
            }
        }

        // 3. Удаляем сам клуб
        return this.prisma.club.delete({
            where: { id },
        });
    }
}