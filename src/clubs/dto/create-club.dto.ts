import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEmail,
    MaxLength,
    IsJSON, IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClubDto {
    @ApiProperty({
        description: 'Название клуба',
        example: 'Фитнес-клуб "Атлант"',
    })
    @IsString({ message: 'Название должно быть строкой' })
    @IsNotEmpty({ message: 'Название обязательно' })
    name: string;

    @ApiProperty({
        description: 'Город',
        example: 'Минск',
    })
    @IsString({ message: 'Город должен быть строкой' })
    @IsNotEmpty({ message: 'Город обязателен' })
    city: string;  // ← новое поле

    @ApiProperty({
        description: 'Массив ссылок на фотографии клуба (загружаются в Cloudinary)',
        example: [
            'https://res.cloudinary.com/dk9i69mvn/image/upload/v1/clubs/gym-1.jpg',
            'https://res.cloudinary.com/dk9i69mvn/image/upload/v1/clubs/gym-2.jpg'
        ],
        required: false,
        type: [String]
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @ApiProperty({
        description: 'Адрес клуба',
        example: 'ул. Ленина, 15',
    })
    @IsString({ message: 'Адрес должен быть строкой' })
    @IsNotEmpty({ message: 'Адрес обязателен' })
    address: string;

    @ApiProperty({
        description: 'Контактный телефон',
        example: '+375291234567',
        required: false,
    })
    @IsString({ message: 'Телефон должен быть строкой' })
    @IsOptional()
    phone?: string;

    @ApiProperty({
        description: 'Email клуба',
        example: 'club@example.com',
        required: false,
    })
    @IsEmail({}, { message: 'Некорректный email' })
    @IsOptional()
    email?: string;

    @ApiProperty({
        description: 'Описание клуба',
        example: 'Современный фитнес-клуб с бассейном и тренажёрным залом',
        required: false,
        maxLength: 500,
    })
    @IsString({ message: 'Описание должно быть строкой' })
    @IsOptional()
    @MaxLength(500, { message: 'Описание не должно превышать 500 символов' })
    description?: string;

    @ApiProperty({
        description: 'URL логотипа (генерируется автоматически после загрузки в Cloudinary)',
        example: 'https://res.cloudinary.com/dk9i69mvn/image/upload/v1/clubs/atlant',
        readOnly: true,
    })
    @IsOptional()
    logo?: string;

    @ApiProperty({
        description: 'Рабочие часы в формате JSON',
        example: '{"monday": "08:00-22:00", "tuesday": "08:00-22:00"}',
        required: false,
    })
    @IsJSON({ message: 'Рабочие часы должны быть в формате JSON' })
    @IsOptional()
    workingHours?: any;
}