import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
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

        // Извлекаем текст ошибки
        let errorText = 'Произошла ошибка';

        if (typeof exceptionResponse === 'string') {
            errorText = exceptionResponse;
        } else if (exceptionResponse.message) {
            errorText = Array.isArray(exceptionResponse.message)
                ? exceptionResponse.message[0]
                : exceptionResponse.message;
        }

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
}