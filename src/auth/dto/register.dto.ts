import {IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, MaxLength} from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class RegisterDto {
    @ApiProperty({
        description: 'Почтовый адрес',
        example: 'example@gmail.com'
    })
    @IsString({message: 'Почта должна быть строкой'})
    @IsEmail({}, { message: 'Некорректный email' })
    @IsNotEmpty({ message: 'Email обязателен' })
    email: string;

    @ApiProperty({
        description: 'Пароль от аккаунта',
        example: '123456',
        minLength: 6,
        maxLength: 128
    })
    @IsString({message: 'Пароль должен быть строкой'})
    @MinLength(6, { message: 'Пароль должен быть минимум 6 символов' })
    @MaxLength(128, { message: 'Пароль должен быть минимум 128 символов' })
    @IsNotEmpty({ message: 'Пароль обязателен для заполнения' })
    password: string;

    @ApiProperty({
        description: 'Отображаемое имя',
        example: 'Грушевский Валентин',
        maxLength: 50
    })
    @IsString()
    @MaxLength(50, { message: 'Пароль должен быть минимум 50 символов' })
    @IsOptional()
    name?: string;

}