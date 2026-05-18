import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
    private readonly shopId: string;
    private readonly apiKey: string;
    private readonly apiUrl = 'https://api.yookassa.ru/v3';

    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
    ) {
        this.shopId = configService.get('YOOKASSA_SHOP_ID');
        this.apiKey = configService.get('YOOKASSA_API_KEY');
    }

    async createPayment(amount: number, userId: number, tariffId: number, clubId: number, description: string) {
        const idempotenceKey = crypto.randomUUID();

        const response = await fetch(`${this.apiUrl}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(`${this.shopId}:${this.apiKey}`).toString('base64'),
                'Idempotence-Key': idempotenceKey,
            },
            body: JSON.stringify({
                amount: {
                    value: amount.toFixed(2),
                    currency: 'RUB',
                },
                confirmation: {
                    type: 'redirect',
                    return_url: 'http://localhost:4200/clubs',
                },
                capture: true,
                description,
                metadata: {
                    userId: userId.toString(),
                    tariffId: tariffId.toString(),
                    clubId: clubId.toString(),
                },
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new BadRequestException(data.description || 'Ошибка при создании платежа');
        }

        return {
            paymentId: data.id,
            confirmationUrl: data.confirmation.confirmation_url,
            amount: data.amount,
            status: data.status,
        };
    }

    async getPayment(paymentId: string) {
        const response = await fetch(`${this.apiUrl}/payments/${paymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${this.shopId}:${this.apiKey}`).toString('base64'),
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new BadRequestException(data.description || 'Ошибка при получении платежа');
        }

        return data;
    }

    async handleWebhook(body: any) {
        const event = body;

        switch (event.event) {
            case 'payment.succeeded':
                const payment = event.object;
                const userId = parseInt(payment.metadata.userId);
                const type = payment.metadata.type;
                const amount = parseFloat(payment.amount.value);

                if (type === 'deposit') {
                    // Только пополнение баланса
                    await this.usersService.deposit(
                        userId,
                        amount,
                        `Пополнение через ЮKassa (платеж ${payment.id})`
                    );
                    return {
                        received: true,
                        message: 'Баланс пополнен',
                    };
                } else {
                    // Пополнение баланса + активация членства
                    const tariffId = parseInt(payment.metadata.tariffId);
                    const clubId = parseInt(payment.metadata.clubId);

                    await this.usersService.deposit(
                        userId,
                        amount,
                        `Пополнение через ЮKassa (платеж ${payment.id})`
                    );

                    await this.usersService.activateMembership(userId, clubId, tariffId);

                    return {
                        received: true,
                        message: 'Баланс пополнен, членство активировано',
                    };
                }

            case 'payment.waiting_for_capture':
                console.log('Платёж ожидает подтверждения:', event.object.id);
                return { received: true };

            case 'payment.canceled':
                const failedPayment = event.object;
                const failedUserId = parseInt(failedPayment.metadata?.userId || '0');

                if (failedUserId) {
                    await this.usersService.createFailedTransaction(
                        failedUserId,
                        parseFloat(failedPayment.amount.value),
                        `Неудачная попытка пополнения через ЮKassa (платеж ${failedPayment.id})`
                    );
                }

                return {
                    received: true,
                    message: 'Платёж отменён'
                };

            default:
                console.log('Необработанное событие:', event.event);
                return { received: true };
        }
    }

    async refundPayment(paymentId: string, amount?: number) {
        const idempotenceKey = crypto.randomUUID();

        const body: any = {
            payment_id: paymentId,
        };

        if (amount) {
            body.amount = {
                value: amount.toFixed(2),
                currency: 'RUB',
            };
        }

        const response = await fetch(`${this.apiUrl}/refunds`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(`${this.shopId}:${this.apiKey}`).toString('base64'),
                'Idempotence-Key': idempotenceKey,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new BadRequestException(data.description || 'Ошибка при возврате');
        }

        return data;
    }

    async deposit(amount: number, userId: number, description: string) {
        const idempotenceKey = crypto.randomUUID();

        const response = await fetch(`${this.apiUrl}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(`${this.shopId}:${this.apiKey}`).toString('base64'),
                'Idempotence-Key': idempotenceKey,
            },
            body: JSON.stringify({
                amount: {
                    value: amount.toFixed(2),
                    currency: 'RUB',
                },
                confirmation: {
                    type: 'redirect',
                    return_url: 'http://localhost:4200/profile?payment=success',
                },
                capture: true,
                description,
                metadata: {
                    userId: userId.toString(),
                    type: 'deposit', // помечаем как пополнение
                },
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new BadRequestException(data.description || 'Ошибка при создании платежа');
        }

        return {
            paymentId: data.id,
            confirmationUrl: data.confirmation.confirmation_url,
            amount: data.amount,
            status: data.status,
        };
    }
}