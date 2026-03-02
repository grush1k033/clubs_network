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
}