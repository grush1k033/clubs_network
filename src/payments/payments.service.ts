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

    async createPayment(amount: number, userId: number, description: string) {
        const idempotenceKey = crypto.randomUUID(); // уникальный ключ для защиты от повторов

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
                    currency: 'BYN',
                },
                confirmation: {
                    type: 'redirect',
                    return_url: 'http://localhost:3001/success', // заменишь позже
                },
                capture: true, // сразу списываем деньги
                description,
                metadata: {
                    userId: userId.toString(),
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
                const amount = parseFloat(payment.amount.value);

                // Успешное пополнение
                await this.usersService.deposit(
                    userId,
                    amount,
                    `Пополнение через ЮKassa (платеж ${payment.id})`
                );

                return {
                    received: true,
                    message: 'Баланс пополнен',
                };

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
                // Другие события просто логируем
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
}