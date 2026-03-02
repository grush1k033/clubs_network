import { IsInt, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class JoinClubDto {
    @IsInt({ message: 'ID клуба должен быть числом' })
    @IsNotEmpty({ message: 'ID клуба обязателен' })
    clubId: number;

    @IsInt({ message: 'ID тарифа должен быть числом' })
    @IsNotEmpty({ message: 'ID тарифа обязателен' })
    tariffId: number;

    @IsBoolean({ message: 'paid должно быть boolean' })
    @IsOptional()
    paid?: boolean;
}