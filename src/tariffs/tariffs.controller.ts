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
} from '@nestjs/common';
import { TariffsService } from './tariffs.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { JwtGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('tariffs')
@UseGuards(JwtGuard, RolesGuard)
export class TariffsController {
    constructor(private readonly tariffsService: TariffsService) {}

    // Создать тариф для клуба (только club_admin или super_admin)
    @Post('club/:clubId')
    @Roles(Role.SUPER_ADMIN, Role.CLUB_ADMIN)
    create(
        @Param('clubId', ParseIntPipe) clubId: number,
        @Body() dto: CreateTariffDto,
    ) {
        return this.tariffsService.create(clubId, dto);
    }

    // Все тарифы клуба (доступно всем авторизованным)
    @Get('club/:clubId')
    findAllByClub(@Param('clubId', ParseIntPipe) clubId: number) {
        return this.tariffsService.findAllByClub(clubId);
    }

    // Один тариф по ID
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.tariffsService.findOne(id);
    }

    // Обновить тариф (только club_admin или super_admin)
    @Patch(':id')
    @Roles(Role.SUPER_ADMIN, Role.CLUB_ADMIN)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTariffDto,
    ) {
        return this.tariffsService.update(id, dto);
    }

    // Удалить тариф (только club_admin или super_admin)
    @Delete(':id')
    @Roles(Role.SUPER_ADMIN, Role.CLUB_ADMIN)
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.tariffsService.remove(id);
    }
}