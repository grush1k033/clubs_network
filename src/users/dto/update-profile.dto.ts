import {IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength} from 'class-validator';

export class UpdateProfileDto {
    @IsEmail({}, { message: 'Некорректный email' })
    @IsOptional()
    email?: string;

    @IsString({ message: 'Имя должно быть строкой' })
    @MaxLength(50, { message: 'Имя не должно превышать 50 символов' })
    @IsOptional()
    name?: string;

}