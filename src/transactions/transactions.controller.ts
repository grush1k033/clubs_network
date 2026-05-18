import {Controller, Get, UseGuards} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import {JwtGuard} from "../auth/guards/auth.guard";
import {Authorized} from "../auth/decorators/authorized.decorator";
import {User} from "@prisma/client";

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

    @Get('my')
    @UseGuards(JwtGuard)
    async getMyTransactions(@Authorized() user: User) {
        return this.transactionsService.findByUserId(user.id);
    }
}
