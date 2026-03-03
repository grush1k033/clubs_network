import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IResponse } from '../interfaces/response.interface';

@Injectable()
export class ResponseFormatInterceptor<T>
    implements NestInterceptor<T, IResponse<T>>
{
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<IResponse<T>> {
        return next.handle().pipe(
            map((data) => ({
                data: data ?? null,
                arr_messages: [], // успех — пустой массив
            })),
        );
    }
}