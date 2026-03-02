import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JoinClubDto } from './dto/join-club.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DepositDto } from './dto/deposit.dto';
import { JwtGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { Authorized } from '../auth/decorators/authorized.decorator';
import { User } from '@prisma/client';

@Controller('users')
@UseGuards(JwtGuard, RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    // ========== БАЗОВЫЕ МЕТОДЫ ==========

    // Все пользователи (только super_admin)
    @Get()
    @Roles(Role.SUPER_ADMIN)
    async findAll() {
        return this.usersService.findAll();
    }

    // Свой профиль (любой авторизованный)
    @Get('me')
    async getMe(@Authorized() user: User) {
        return this.usersService.findOne(user.id);
    }

    // Профиль другого пользователя (только super_admin)
    @Get(':id')
    @Roles(Role.SUPER_ADMIN)
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.findOne(id);
    }

    // Обновить свой профиль
    @Patch('me')
    async updateMe(
        @Authorized() user: User,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.usersService.updateProfile(user.id, dto);
    }

    // ========== УПРАВЛЕНИЕ РОЛЯМИ ==========

    // Сменить роль пользователя (только super_admin)
    @Patch(':id/role')
    @Roles(Role.SUPER_ADMIN)
    async updateRole(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateRoleDto,
    ) {
        return this.usersService.updateRole(id, dto);
    }

    // ========== БАЛАНС И ТРАНЗАКЦИИ ==========

    // Пополнить баланс (сам себе)
    @Post('me/deposit')
    async deposit(
        @Authorized() user: User,
        @Body() dto: DepositDto,
    ) {
        return this.usersService.deposit(user.id, dto.amount, dto.description);
    }

    // История своих транзакций
    @Get('me/transactions')
    async getMyTransactions(@Authorized() user: User) {
        return this.usersService.getTransactions(user.id);
    }

    // История транзакций другого пользователя (только super_admin)
    @Get(':id/transactions')
    @Roles(Role.SUPER_ADMIN)
    async getUserTransactions(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.getTransactions(id);
    }

    // ========== ВСТУПЛЕНИЕ В КЛУБ ==========

    // Вступить в клуб (купить тариф)
    @Post('me/join-club')
    async joinClub(
        @Authorized() user: User,
        @Body() dto: JoinClubDto,
    ) {
        return this.usersService.joinClub(user.id, dto);
    }

    // ========== УДАЛЕНИЕ ==========

    // Удалить свой аккаунт
    @Delete('me')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteMe(@Authorized() user: User) {
        // TODO: добавить метод удаления в сервис
        // await this.usersService.remove(user.id);
    }

    // Удалить любого пользователя (только super_admin)
    @Delete(':id')
    @Roles(Role.SUPER_ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', ParseIntPipe) id: number) {
        // TODO: добавить метод удаления в сервис
        // await this.usersService.remove(id);
    }
}