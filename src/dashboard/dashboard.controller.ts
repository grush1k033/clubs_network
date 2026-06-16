import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtGuard } from '../auth/guards/auth.guard';
import { Authorized } from '../auth/decorators/authorized.decorator';
import { User } from '@prisma/client';

@Controller('dashboard')
@UseGuards(JwtGuard)
export class DashboardController {
    constructor(private dashboardService: DashboardService) {}

    @Get('stats')
    async getStats(@Authorized() user: User) {
        const isSuperAdmin = user.role === 'super_admin';
        const clubId = isSuperAdmin ? undefined : user.clubId;
        return this.dashboardService.getStats(clubId);
    }
    @Get('revenue-by-month')
    @UseGuards(JwtGuard)
    async getRevenueByMonth(@Authorized() user: User) {
        const isSuperAdmin = user.role === 'super_admin';
        const clubId = isSuperAdmin ? undefined : user.clubId;
        return this.dashboardService.getRevenueByMonth(clubId);
    }

    @Get('best-selling-tariffs')
    @UseGuards(JwtGuard)
    async getBestSellingTariffs(@Authorized() user: User) {
        const isSuperAdmin = user.role === 'super_admin';
        const clubId = isSuperAdmin ? undefined : user.clubId;
        return this.dashboardService.getBestSellingTariffs(clubId);
    }

    @Get('top-clubs')
    @UseGuards(JwtGuard)
    async getTopClubs() {
        return this.dashboardService.getTopClubs();
    }
}