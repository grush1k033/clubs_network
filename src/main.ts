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

    app.enableCors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                'http://localhost:4200',
                'http://138.68.94.59',
                'https://clubs-network.onrender.com',
                'http://192.168.100.52:4200',
            ];

            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], // это уже есть
    });



    app.use(cookieParser());

    app.useGlobalInterceptors(new ResponseFormatInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    const isDev = configService.get('NODE_ENV') === 'development';


    setupSwagger(app);

    const port = configService.get('PORT') || 3000;
    await app.listen(port);

    console.log(`🚀 Сервер запущен в ${isDev ? 'development' : 'production'} режиме на http://localhost:${port}`);
}
bootstrap();