import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as webpush from 'web-push';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);
    private webpush;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService
    ) {
        this.initializeWebPush();
    }

    private initializeWebPush() {
        const subject = this.configService.get('VAPID_SUBJECT');
        const publicKey = this.configService.get('VAPID_PUBLIC_KEY');
        const privateKey = this.configService.get('VAPID_PRIVATE_KEY');

        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.webpush = webpush;
    }

    async saveSubscription(userId: number, subscription: any, userAgent?: string) {
        const { endpoint, keys } = subscription;

        const existing = await this.prisma.pushSubscription.findUnique({
            where: { endpoint }
        });

        if (existing) {
            return this.prisma.pushSubscription.update({
                where: { endpoint },
                data: {
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    userAgent,
                    userId
                }
            });
        }

        return this.prisma.pushSubscription.create({
            data: {
                userId,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                userAgent
            }
        });
    }

    async removeSubscription(endpoint: string) {
        return this.prisma.pushSubscription.delete({
            where: { endpoint }
        });
    }

    async sendToUser(userId: number, payload: any) {
        const subscriptions = await this.prisma.pushSubscription.findMany({
            where: { userId }
        });

        if (subscriptions.length === 0) {
            this.logger.log(`Нет подписок для пользователя ${userId}`);
            return;
        }

        for (const sub of subscriptions) {
            try {
                await this.webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth
                        }
                    },
                    JSON.stringify(payload),
                    { TTL: 60 * 60 * 24 }
                );
            } catch (error) {
                this.logger.error(`Ошибка отправки на ${sub.endpoint}: ${error.message}`);
                // Если подписка невалидна - удаляем
                if (error.statusCode === 410) {
                    await this.prisma.pushSubscription.delete({
                        where: { id: sub.id }
                    }).catch(() => {});
                }
            }
        }
    }
}