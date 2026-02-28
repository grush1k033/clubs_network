import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEmail,
    MaxLength,
    IsJSON,
} from 'class-validator';

export class CreateClubDto {
    @IsString({ message: 'Название должно быть строкой' })
    @IsNotEmpty({ message: 'Название обязательно' })
    name: string;

    @IsString({ message: 'Адрес должен быть строкой' })
    @IsNotEmpty({ message: 'Адрес обязателен' })
    address: string;

    @IsString({ message: 'Телефон должен быть строкой' })
    @IsOptional()
    phone?: string;

    @IsEmail({}, { message: 'Некорректный email' })
    @IsOptional()
    email?: string;

    @IsString({ message: 'Описание должно быть строкой' })
    @IsOptional()
    @MaxLength(500, { message: 'Описание не должно превышать 500 символов' })
    description?: string;

    @IsString({ message: 'URL логотипа должен быть строкой' })
    @IsOptional()
    logo?: string;

    @IsJSON({ message: 'Рабочие часы должны быть в формате JSON' })
    @IsOptional()
    workingHours?: any; // или можно создать отдельный тип
}