import { IsNumber, Min, IsString, IsOptional } from 'class-validator';

export class DepositDto {
    @IsNumber({}, { message: 'Сумма должна быть числом' })
    @Min(0.01, { message: 'Сумма должна быть больше 0' })
    amount: number;

    @IsString({ message: 'Описание должно быть строкой' })
    @IsOptional()
    description?: string;
}