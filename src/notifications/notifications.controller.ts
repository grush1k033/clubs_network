import {Controller, Post, Delete, Body, Req, Get, Query} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Authorization } from '../auth/decorators/authorization.decorator';
import { Authorized } from '../auth/decorators/authorized.decorator';
import type { Request } from 'express';

@Controller('notifications')
@Authorization()
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Post('subscribe')
    async subscribe(
        @Authorized('id') userId: number,
        @Body() body: { subscription: any },
        @Req() req: Request
    ) {
        await this.notificationsService.saveSubscription(
            userId,
            body.subscription,
            req.headers['user-agent']
        );
        return { success: true };
    }

    @Delete('unsubscribe')
    async unsubscribe(@Body('endpoint') endpoint: string) {
        await this.notificationsService.removeSubscription(endpoint);
        return { success: true };
    }

    @Get('test-send')
    async testSend(
        @Authorized('id') userId: number,
        @Query('message') message: string
    ) {
        const payload = {
            title: 'Тестовое уведомление',
            body: message || 'Привет от сервера!',
            data: { url: '/profile' }
        };

        await this.notificationsService.sendToUser(userId, payload);
        return { success: true, message: 'Уведомление отправлено' };
    }
}