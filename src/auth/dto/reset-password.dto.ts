import {IsString, IsNotEmpty, MinLength, MaxLength} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ example: 'newpassword123' })
    @IsString()
    @MinLength(6, { message: 'Пароль должен быть минимум 6 символов' })
    @MaxLength(128, { message: 'Пароль должен быть минимум 128 символов' })
    @IsNotEmpty({ message: 'Пароль обязателен для заполнения' })
    password: string;
}