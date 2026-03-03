import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from "cookie-parser";
import { setupSwagger } from "./utils/swagger.util";
import { ConfigService } from '@nestjs/config';
import {ResponseFormatInterceptor} from "./common/interceptors/response-format.interceptor";
import {HttpExceptionFilter} from "./common/filters/http-exception.filter";


async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    app.use(cookieParser());

    app.useGlobalInterceptors(new ResponseFormatInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    const isDev = configService.get('NODE_ENV') === 'development';

    app.enableCors({
        origin: isDev ? '*' : true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    setupSwagger(app);

    const port = configService.get('PORT') || 3000;
    await app.listen(port);

    console.log(`🚀 Сервер запущен в ${isDev ? 'development' : 'production'} режиме на http://localhost:${port}`);
}
bootstrap();