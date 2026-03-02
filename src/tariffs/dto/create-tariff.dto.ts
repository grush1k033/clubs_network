import {
    IsString,
    IsEnum,
    IsNumber,
    IsBoolean,
    IsOptional,
    Min,
} from 'class-validator';
import { TariffType } from '@prisma/client';

export class CreateTariffDto {
    @IsString({ message: 'Название обязательно' })
    name: string;

    @IsEnum(TariffType, { message: 'Некорректный тип тарифа' })
    type: TariffType;

    @IsNumber({}, { message: 'Цена должна быть числом' })
    @Min(0, { message: 'Цена не может быть отрицательной' })
    price: number;

    @IsNumber({}, { message: 'Длительность должна быть числом' })
    @IsOptional()
    duration?: number;

    @IsBoolean({ message: 'isActive должно быть boolean' })
    @IsOptional()
    isActive?: boolean;
}