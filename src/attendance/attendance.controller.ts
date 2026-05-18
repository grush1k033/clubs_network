import {Controller, Get, UseGuards} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import {JwtGuard} from "../auth/guards/auth.guard";
import {Authorized} from "../auth/decorators/authorized.decorator";
import {User} from "@prisma/client";

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

    @Get('my')
    @UseGuards(JwtGuard)
    async getMyAttendance(@Authorized() user: User) {
        return this.attendanceService.findByUserId(user.id);
    }
}
