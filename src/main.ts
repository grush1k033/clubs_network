import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from "cookie-parser";
import { setupSwagger } from "./utils/swagger.util";
import { ConfigService } from '@nestjs/config';


async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    app.use(cookieParser());

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    const isDev = configService.get('NODE_ENV') === 'development';
    const clientUrl = configService.get('CLIENT_URL');

    app.enableCors({
        origin: isDev ? ['http://localhost:4200'] : clientUrl,
        credentials: true,
    });

    setupSwagger(app);

    const port = configService.get('PORT') || 3000;
    await app.listen(port);

    console.log(`🚀 Сервер запущен в ${isDev ? 'development' : 'production'} режиме на http://localhost:${port}`);
}
bootstrap();