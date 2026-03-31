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

    async create(dto: CreateClubDto, files?: Express.Multer.File[]) {
        let logoUrl: string | undefined;
        let images: string[] = [];

        if (files && files.length > 0) {

            logoUrl = await this.uploadService.uploadImage(files[0], 'clubs-logos');

            if (files.length > 1) {
                images = await Promise.all(
                    files.slice(1).map(file =>
                        this.uploadService.uploadImage(file, `club-images/${Date.now()}`)
                    )
                );
            }
        }

        try {
            return await this.prisma.club.create({
                data: {
                    ...dto,
                    logo: logoUrl || dto.logo,
                    images, // ← сохраняем массив
                },
            });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new ConflictException('Клуб с таким названием уже существует');
            }
            throw error;
        }
    }

    async findAll() {
        return this.prisma.club.findMany();
    }

    async findOne(id: number) {
        const club = await this.prisma.club.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { users: true },
                },
            },
        });

        if (!club) {
            throw new NotFoundException(`Клуб с ID ${id} не найден`);
        }

        const { _count, ...clubData } = club;

        return {
            ...clubData,
            usersCount: _count.users,
        };
    }

    async update(id: number, dto: UpdateClubDto, files?: Express.Multer.File[]) {
        const oldClub = await this.findOne(id);

        let logoUrl: string | undefined;
        let images: string[] = oldClub.images || [];

        if (files && files.length > 0) {
            // Обновляем логотип (если есть)
            if (oldClub.logo) {
                const publicId = this.uploadService.extractPublicIdFromUrl(oldClub.logo);
                if (publicId) {
                    await this.uploadService.deleteImage(publicId).catch(() => {});
                }
            }
            logoUrl = await this.uploadService.uploadImage(files[0], `club-${id}`);

            if (files.length > 1) {
                const newImages = await Promise.all(
                    files.slice(1).map(file =>
                        this.uploadService.uploadImage(file, `club-images/${id}-${Date.now()}`)
                    )
                );
                images = [...images, ...newImages]; // добавляем к существующим
            }
        }

        return this.prisma.club.update({
            where: { id },
            data: {
                ...dto,
                logo: logoUrl || dto.logo,
                images, // ← обновляем массив
            },
        });
    }

    async remove(id: number) {
        const club = await this.findOne(id);

        await this.prisma.user.updateMany({
            where: { clubId: id },
            data: {
                clubId: null,
                tariffId: null,
                startDate: null,
                endDate: null,
                paid: false,
                paidAt: null,
                position: null,
                hiredAt: null,
            },
        });

        if (club.logo) {
            const publicId = this.uploadService.extractPublicIdFromUrl(club.logo);
            if (publicId) {
                await this.uploadService.deleteImage(publicId).catch(() => {});
            }
        }

        if (club.images && club.images.length > 0) {
            await Promise.all(
                club.images.map(async (imageUrl) => {
                    const publicId = this.uploadService.extractPublicIdFromUrl(imageUrl);
                    if (publicId) {
                        await this.uploadService.deleteImage(publicId).catch(() => {});
                    }
                })
            );
        }

        return this.prisma.club.delete({
            where: { id },
        });
    }
}