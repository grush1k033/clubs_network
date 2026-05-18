import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
    @IsInt({ message: 'ID клуба должен быть числом' })
    clubId: number;

    @IsInt({ message: 'Оценка должна быть числом' })
    @Min(1, { message: 'Оценка должна быть от 1 до 5' })
    @Max(5, { message: 'Оценка должна быть от 1 до 5' })
    rating: number;

    @IsString({ message: 'Комментарий должен быть строкой' })
    @IsOptional()
    comment?: string;
}