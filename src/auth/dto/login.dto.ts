import {IsEmail, IsNotEmpty, IsString, MinLength} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";

export class LoginDto {
    @ApiProperty({
        description: 'Почтовый адрес',
        example: 'example@gmail.com'
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Пароль от аккаунта',
        example: '123456',
        minLength: 6,
        maxLength: 128
    })
    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    password: string;
}