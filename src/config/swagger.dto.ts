import {DocumentBuilder} from "@nestjs/swagger";

export function getSwaggerConfig() {
    return new DocumentBuilder()
        .setTitle('Awesome API')
        .setDescription('Bla-bla')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build()
}