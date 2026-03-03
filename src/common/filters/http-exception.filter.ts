import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { IResponse } from '../interfaces/response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse() as any;

        // Определяем русское сообщение в зависимости от статуса
        let errorText = this.getRussianMessage(status, exceptionResponse);

        const errorResponse: IResponse<null> = {
            data: null,
            arr_messages: [
                {
                    type: 'E',
                    text: errorText,
                },
            ],
        };

        response.status(status).json(errorResponse);
    }

    private getRussianMessage(status: number, exceptionResponse: any): string {
        // Приоритет: если в исключении уже есть русское сообщение
        if (exceptionResponse.message) {
            const message = exceptionResponse.message;
            // Если это массив ошибок валидации
            if (Array.isArray(message) && message.length > 0) {
                return message[0]; // берём первую ошибку
            }
            // Если это строка
            if (typeof message === 'string') {
                // Проверяем, не английское ли это стандартное сообщение
                const englishMessages = [
                    'Unauthorized',
                    'Forbidden',
                    'Not Found',
                    'Bad Request',
                    'Conflict',
                    'Internal Server Error',
                ];

                // Если сообщение английское стандартное — заменяем
                if (englishMessages.includes(message)) {
                    return this.getRussianMessageByStatus(status);
                }
                // Иначе оставляем как есть (может быть уже русское)
                return message;
            }
        }

        // Если ничего не подошло — возвращаем по статусу
        return this.getRussianMessageByStatus(status);
    }

    private getRussianMessageByStatus(status: number): string {
        switch (status) {
            case HttpStatus.BAD_REQUEST:
                return 'Некорректные входные данные';
            case HttpStatus.UNAUTHORIZED:
                return 'Токен не валидный или отсутствует';
            case HttpStatus.FORBIDDEN:
                return 'Доступ запрещён';
            case HttpStatus.NOT_FOUND:
                return 'Пользователь не найден';
            case HttpStatus.CONFLICT:
                return 'Пользователь с такой почтой уже существует';
            case HttpStatus.INTERNAL_SERVER_ERROR:
                return 'Внутренняя ошибка сервера';
            default:
                return 'Произошла ошибка';
        }
    }
}