import { Controller, Get, Post, Delete, Param, Body, UseGuards, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { JwtGuard } from '../auth/guards/auth.guard';
import { Authorized } from '../auth/decorators/authorized.decorator';
import { User } from '@prisma/client';

@Controller('workouts')
@UseGuards(JwtGuard)
export class WorkoutsController {
    constructor(private readonly workoutsService: WorkoutsService) {}

    // Получить расписание клуба текущего пользователя
    @Get('my-club')
    async getMyClubWorkouts(@Authorized() user: User) {
        if (!user.clubId) {
            throw new BadRequestException('Вы не привязаны к клубу');
        }
        return this.workoutsService.getByClub(user.clubId);
    }

    // Записаться на тренировку
    @Post('book')
    async bookWorkout(@Authorized() user: User, @Body('workoutId') workoutId: number) {
        return this.workoutsService.book(user.id, workoutId);
    }

    // Отменить запись на тренировку
    @Delete('cancel/:workoutId')
    async cancelBooking(@Authorized() user: User, @Param('workoutId', ParseIntPipe) workoutId: number) {
        return this.workoutsService.cancel(user.id, workoutId);
    }
}