import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from "cookie-parser";
import {setupSwagger} from "./utils/swagger.util";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use(cookieParser())

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    app.enableCors();

    setupSwagger(app)

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`🚀 Сервер запущен на http://localhost:${port}`);
}
bootstrap();