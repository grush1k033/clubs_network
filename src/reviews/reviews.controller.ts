import { Controller, Post, Body, Get, Param, Delete, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtGuard } from '../auth/guards/auth.guard';
import { Authorized } from '../auth/decorators/authorized.decorator';
import { User } from '@prisma/client';

@Controller('reviews')
export class ReviewsController {
    constructor(private reviewsService: ReviewsService) {}

    @Post()
    @UseGuards(JwtGuard)
    create(@Authorized() user: User, @Body() dto: CreateReviewDto) {
        return this.reviewsService.create(user.id, dto);
    }

    @Get('club/:clubId')
    findByClub(@Param('clubId') clubId: string) {
        return this.reviewsService.findByClub(+clubId);
    }

    @Delete(':id')
    @UseGuards(JwtGuard)
    async delete(@Param('id') id: string, @Authorized() user: User) {
        const isSuperAdmin = user.role === 'super_admin';
        return this.reviewsService.delete(+id, user.id, isSuperAdmin);
    }
}