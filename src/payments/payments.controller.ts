import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtGuard } from '../auth/guards/auth.guard';
import { Authorized } from '../auth/decorators/authorized.decorator';
import { User } from '@prisma/client';
import { Request } from 'express';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    /**
     * Создание платежа (пополнение баланса)
     */
    @Post('create')
    @UseGuards(JwtGuard)
    async createPayment(
        @Authorized() user: User,
        @Body() dto: CreatePaymentDto,
    ) {
        const description = dto.description || `Пополнение баланса пользователя ${user.email}`;

        const payment = await this.paymentsService.createPayment(
            dto.amount, // 👈 берем из dto
            user.id,
            description,
        );

        return {
            success: true,
            paymentId: payment.paymentId,
            confirmationUrl: payment.confirmationUrl,
        };
    }

    /**
     * Получение информации о платеже
     */
    @Get(':paymentId')
    @UseGuards(JwtGuard)
    async getPayment(@Param('paymentId') paymentId: string) {
        const payment = await this.paymentsService.getPayment(paymentId);
        return payment;
    }

    /**
     * Webhook для уведомлений от ЮKassa
     */
    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(@Req() req: Request) {
        const result = await this.paymentsService.handleWebhook(req.body);
        return result;
    }

    /**
     * Возврат платежа
     */
    @Post(':paymentId/refund')
    @UseGuards(JwtGuard)
    async refundPayment(
        @Param('paymentId') paymentId: string,
        @Body('amount') amount?: number,
    ) {
        // TODO: добавить проверку роли (только super_admin)
        const refund = await this.paymentsService.refundPayment(paymentId, amount);
        return refund;
    }
}