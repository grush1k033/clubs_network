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
    HttpStatus, BadRequestException, ForbiddenException,
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
import {UpdateUserAdminDto} from "./dto/update-user-admin.dto";

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('my-club-trainers')
    @UseGuards(JwtGuard)
    async getMyClubTrainers(@Authorized() user: User) {
        console.log('User ID:', user.id);
        console.log('User ClubId:', user.clubId);
        const clubId = user.clubId;
        if (!clubId) {
            throw new BadRequestException('Вы не привязаны к клубу');
        }
        return this.usersService.getTrainersByClub(clubId);
    }

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

    @Get('trainer/stats')
    @UseGuards(JwtGuard)
    async getTrainerStats(@Authorized() user: User) {
        if (user.role !== 'trainer') {
            throw new BadRequestException('Только тренер может получить эту статистику');
        }
        return this.usersService.getTrainerStats(user.id);
    }

    @Get('trainer/students')
    @UseGuards(JwtGuard)
    async getTrainerStudents(@Authorized() user: User) {
        if (user.role !== 'trainer') {
            throw new BadRequestException('Только тренер может получить список участников');
        }
        return this.usersService.getTrainerStudents(user.id);
    }

    @Get('trainer/workouts')
    @UseGuards(JwtGuard)
    async getTrainerWorkouts(@Authorized() user: User) {
        if (user.role !== 'trainer') {
            throw new BadRequestException('Только тренер может получить список тренировок');
        }
        return this.usersService.getTrainerWorkouts(user.id);
    }

    // Для клиента: получить всех тренеров клуба (по clubId пользователя)


// Для клиента: получить тренировки конкретного тренера (по id тренера)
    @Get('trainer-workouts/:id')
    @UseGuards(JwtGuard)
    async getTrainerWorkoutsForClient(@Param('id') trainerId: string) {
        return this.usersService.getTrainerWorkoutsForClient(Number(trainerId));
    }

    @Get('trainer/:id')
    @Roles(Role.USER, Role.MEMBER, Role.TRAINER, Role.CLUB_ADMIN, Role.SUPER_ADMIN)
    @UseGuards(JwtGuard, RolesGuard)
    async getTrainerDetail(@Param('id') id: string) {
        const parsedId = +id;
        if (isNaN(parsedId)) {
            throw new BadRequestException('ID должен быть числом');
        }
        return this.usersService.getTrainerDetail(parsedId);
    }

    // ========== НОВЫЕ ЭНДПОИНТЫ ДЛЯ АДМИН-ПАНЕЛИ ==========

// Получить всех пользователей (для админ-панели)
    @Get('admin')
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.CLUB_ADMIN)
    async getAdminUsers(@Authorized() currentUser: User) {
        const where: any = {};

        // Если не супер-админ, показываем только пользователей его клуба
        if (currentUser.role !== 'super_admin') {
            if (!currentUser.clubId) {
                throw new BadRequestException('У вас нет привязки к клубу');
            }
            where.clubId = currentUser.clubId;
        }

        return this.usersService.findUsers(where);
    }

// Обновить пользователя (для админ-панели)
    @Patch('admin/:id')
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.CLUB_ADMIN)
    async updateAdminUser(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateUserAdminDto,
        @Authorized() currentUser: User,
    ) {
        // Проверка прав: админ клуба может редактировать только пользователей своего клуба
        if (currentUser.role !== 'super_admin') {
            const user = await this.usersService.findOne(id);
            if (!user) {
                throw new BadRequestException('Пользователь не найден');
            }
            if (user.clubId !== currentUser.clubId) {
                throw new ForbiddenException('Доступ запрещен');
            }
        }
        return this.usersService.update(id, dto);
    }
}