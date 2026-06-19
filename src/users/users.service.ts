import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {UpdateRoleDto} from "./dto/update-role.dto";
import {JoinClubDto} from "./dto/join-club.dto";
import {UpdateProfileDto} from "./dto/update-profile.dto";


@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    // ========== БАЗОВЫЕ МЕТОДЫ ==========

    // Получить всех пользователей
    async findAll() {
        return this.prisma.user.findMany({
            include: {
                balance: true,
                club: true,
                tariff: true,
            },
        });
    }

    // Получить пользователей с фильтром (для админ-панели)
    async findUsers(where?: any) {
        return this.prisma.user.findMany({
            where,
            include: {
                balance: true,
                club: true,
                tariff: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // Получить одного пользователя по ID
    async findOne(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                balance: true,
                club: true,
                tariff: true,
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 50, // последние 50 транзакций
                },
            },
        });

        if (!user) {
            throw new NotFoundException(`Пользователь с ID ${id} не найден`);
        }

        return user;
    }

    // Обновить профиль (имя, email)
    async updateProfile(id: number, dto: UpdateProfileDto) {
        await this.findOne(id);

        return this.prisma.user.update({
            where: { id },
            data: dto,
        });
    }

    // ========== УПРАВЛЕНИЕ РОЛЯМИ ==========

    // Сменить роль (только для super_admin)
    async updateRole(id: number, dto: UpdateRoleDto) {
        const user = await this.findOne(id);

        // Если новое роль — member, но у пользователя нет clubId — ошибка
        if (dto.role === 'member' && !user.clubId) {
            throw new BadRequestException(
                'Нельзя назначить роль member пользователю без привязки к клубу',
            );
        }

        return this.prisma.user.update({
            where: { id },
            data: { role: dto.role },
        });
    }

    // ========== РАБОТА С БАЛАНСОМ ==========

    // Пополнить баланс
    async deposit(userId: number, amount: number, description?: string) {
        if (amount <= 0) {
            throw new BadRequestException('Сумма пополнения должна быть положительной');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { balance: true },
        });

        if (!user) {
            throw new NotFoundException('Пользователь не найден');
        }

        // Если у пользователя ещё нет баланса — создаём
        if (!user.balance) {
            return this.prisma.$transaction([
                this.prisma.balance.create({
                    data: {
                        userId,
                        amount,
                    },
                }),
                this.prisma.transaction.create({
                    data: {
                        userId,
                        type: 'deposit',
                        amount,
                        balanceAfter: amount,
                        description: description || 'Пополнение баланса',
                    },
                }),
            ]);
        }

        // Если баланс уже есть — обновляем
        const newBalance = user.balance.amount + amount;

        return this.prisma.$transaction([
            this.prisma.balance.update({
                where: { userId },
                data: { amount: { increment: amount } },
            }),
            this.prisma.transaction.create({
                data: {
                    userId,
                    type: 'deposit',
                    amount,
                    balanceAfter: newBalance,
                    description: description || 'Пополнение баланса',
                },
            }),
        ]);
    }

    // ========== ВСТУПЛЕНИЕ В КЛУБ И ПОКУПКА ТАРИФА ==========

    // Вступить в клуб (купить тариф)
    async joinClub(userId: number, dto: JoinClubDto) {
        const { clubId, tariffId } = dto;

        // 1. Получаем пользователя с балансом
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { balance: true },
        });

        if (!user) {
            throw new NotFoundException('Пользователь не найден');
        }

        // 2. Проверяем, не состоит ли уже в клубе
        if (user.clubId) {
            throw new BadRequestException(
                `Пользователь уже состоит в клубе ${user.clubId}`,
            );
        }

        // 3. Получаем тариф
        const tariff = await this.prisma.tariff.findUnique({
            where: { id: tariffId },
        });

        if (!tariff) {
            throw new NotFoundException('Тариф не найден');
        }

        // 4. Проверяем, что тариф принадлежит выбранному клубу
        if (tariff.clubId !== clubId) {
            throw new BadRequestException('Тариф не принадлежит выбранному клубу');
        }

        // 5. Проверяем баланс
        const hasEnoughMoney = user.balance && user.balance.amount >= tariff.price;

        // 6. Рассчитываем дату окончания (если понадобится)
        const startDate = new Date();
        const endDate = new Date(startDate);

        if (tariff.duration) {
            endDate.setDate(endDate.getDate() + tariff.duration);
        } else {
            endDate.setHours(23, 59, 59, 999);
        }

        // 7. Если денег хватает — проводим оплату
        if (hasEnoughMoney) {
            const newBalance = user.balance!.amount - tariff.price;

            return this.prisma.$transaction([
                // Списываем деньги
                this.prisma.balance.update({
                    where: { userId },
                    data: { amount: { decrement: tariff.price } },
                }),

                // Записываем успешную транзакцию
                this.prisma.transaction.create({
                    data: {
                        userId,
                        type: 'payment',
                        amount: -tariff.price,
                        balanceAfter: newBalance,
                        tariffId,
                        clubId,
                        description: `Оплата тарифа "${tariff.name}"`,
                    },
                }),

                // Обновляем пользователя
                this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        role: 'member',
                        clubId,
                        tariffId,
                        startDate,
                        endDate,
                        paid: true,
                        paidAt: new Date(),
                    },
                }),
            ]);
        }

        // 8. Если денег не хватает — логируем неудачную попытку и кидаем ошибку
        else {
            // Записываем failed_payment
            await this.prisma.transaction.create({
                data: {
                    userId,
                    type: 'failed_payment',
                    amount: 0,
                    balanceAfter: user.balance?.amount || 0,
                    tariffId,
                    clubId,
                    description: `Неудачная попытка оплаты тарифа "${tariff.name}". Нужно: ${tariff.price}, на балансе: ${user.balance?.amount || 0}`,
                },
            });

            throw new BadRequestException(
                `Недостаточно средств. Нужно: ${tariff.price}, на балансе: ${user.balance?.amount || 0}`,
            );
        }
    }

    // ========== ИСТОРИЯ ТРАНЗАКЦИЙ ==========

    // Получить историю транзакций пользователя
    async getTransactions(userId: number, limit: number = 50) {
        await this.findOne(userId);

        return this.prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    async createFailedTransaction(userId: number, amount: number, description: string) {
        const user = await this.findOne(userId);

        return this.prisma.transaction.create({
            data: {
                userId,
                type: 'failed_payment',
                amount: 0, // или можно хранить amount со знаком?
                balanceAfter: user.balance?.amount || 0,
                description,
            },
        });
    }
    async activateMembership(userId: number, clubId: number, tariffId: number) {
        const tariff = await this.prisma.tariff.findUnique({ where: { id: tariffId } });
        if (!tariff) {
            throw new BadRequestException('Тариф не найден');
        }

        const startDate = new Date();
        const endDate = new Date();
        if (tariff.duration) {
            endDate.setDate(endDate.getDate() + tariff.duration);
        } else {
            endDate.setHours(23, 59, 59, 999);
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                role: 'member',
                clubId,
                tariffId,
                startDate,
                endDate,
                paid: true,
                paidAt: new Date(),
            },
        });
    }

    async getTrainerStats(userId: number) {
        // Количество участников, закреплённых за тренером
        const totalStudents = await this.prisma.user.count({
            where: { trainerId: userId, role: 'member' },
        });

        // Количество тренировок, которые вёл тренер
        const totalWorkouts = await this.prisma.workout.count({
            where: { trainerId: userId },
        });

        return { totalStudents, totalWorkouts };
    }

    async getTrainerStudents(trainerId: number) {
        return this.prisma.user.findMany({
            where: { trainerId, role: 'member' },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getTrainerWorkouts(trainerId: number) {
        return this.prisma.workout.findMany({
            where: { trainerId },
            orderBy: { startTime: 'desc' },
        });
    }

    async getTrainersByClub(clubId: number) {
        return this.prisma.user.findMany({
            where: {
                clubId,
                role: 'trainer',
            },
            select: {
                id: true,
                name: true,
                email: true,
                position: true,
            },
            orderBy: { name: 'asc' },
        });
    }

    async getTrainerWorkoutsForClient(trainerId: number) {
        // Проверяем, что это тренер
        const trainer = await this.prisma.user.findUnique({
            where: { id: trainerId },
        });
        if (!trainer || trainer.role !== 'trainer') {
            throw new BadRequestException('Тренер не найден');
        }

        return this.prisma.workout.findMany({
            where: {
                trainerId,
                startTime: { gt: new Date() }, // только будущие тренировки
            },
            select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                maxParticipants: true,
                currentParticipants: true,
            },
            orderBy: { startTime: 'asc' },
        });
    }

    async getTrainerDetail(id: number) {
        const trainer = await this.prisma.user.findUnique({
            where: { id, role: 'trainer' },
            include: {
                club: {
                    select: { name: true }
                },
                workoutsAsTrainer: {
                    where: {
                        startTime: { gte: new Date() }
                    },
                    orderBy: { startTime: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        startTime: true,
                        endTime: true,
                        maxParticipants: true,
                        currentParticipants: true,
                    }
                }
            }
        });

        if (!trainer) {
            throw new NotFoundException('Тренер не найден');
        }

        // Получаем студентов отдельно
        const students = await this.prisma.user.findMany({
            where: { trainerId: id, role: 'member' },
            select: {
                id: true,
                name: true,
                email: true,
            }
        });

        return {
            ...trainer,
            students,
        };
    }
}