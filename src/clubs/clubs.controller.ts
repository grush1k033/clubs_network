import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
    UseGuards,
    UseInterceptors,
    UploadedFile, UploadedFiles,
} from '@nestjs/common';
import {FileInterceptor, FilesInterceptor} from '@nestjs/platform-express';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { JwtGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('clubs')
@UseGuards(JwtGuard, RolesGuard)
export class ClubsController {
    constructor(private readonly clubsService: ClubsService) {}

    // Создание клуба (только super_admin)
    @Post()
    @Roles(Role.SUPER_ADMIN)
    @UseInterceptors(FilesInterceptor('files'))
    async create(
        @Body() dto: CreateClubDto,
        @UploadedFiles() files?: Express.Multer.File[],
    ) {
        return this.clubsService.create(dto, files);
    }

    // Все клубы (доступно всем авторизованным)
    @Get()
    async findAll() {
        return this.clubsService.findAll();
    }

    // Один клуб + его пользователи (доступно всем)
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.clubsService.findOne(id);
    }

    // Обновление клуба (super_admin или club_admin этого клуба)
    @Patch(':id')
    @Roles(Role.SUPER_ADMIN, Role.CLUB_ADMIN)
    @UseInterceptors(FilesInterceptor('files'))
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateClubDto,
        @UploadedFiles() files?: Express.Multer.File[],
    ) {
        return this.clubsService.update(id, dto, files);
    }

    // Удаление клуба (только super_admin)
    @Delete(':id')
    @Roles(Role.SUPER_ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.clubsService.remove(id);
    }
}