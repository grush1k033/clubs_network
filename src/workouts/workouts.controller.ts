import {Body, Controller, Post, UseGuards} from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import {JwtGuard} from "../auth/guards/auth.guard";
import {Authorized} from "../auth/decorators/authorized.decorator";
import {User} from "@prisma/client";

@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

    @Post('book')
    @UseGuards(JwtGuard)
    async bookWorkout(@Authorized() user: User, @Body('workoutId') workoutId: number) {
        return this.workoutsService.book(user.id, workoutId);
    }
}
