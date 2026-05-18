import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreatePaymentDto {
    @IsNumber({}, { message: 'Сумма должна быть числом' })
    @Min(0.01, { message: 'Сумма должна быть больше 0' })
    amount: number;

    @IsString({ message: 'Описание должно быть строкой' })
    @IsOptional()
    description?: string;

    @IsNumber({}, { message: 'ID тарифа должен быть числом' })
    tariffId: number;

    @IsNumber({}, { message: 'ID клуба должен быть числом' })
    clubId: number;
}