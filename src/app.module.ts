import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from "./prisma/prisma.module";
import { UploadModule } from './upload/upload.module';
import { ClubsModule } from './clubs/clubs.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: process.env.NODE_ENV === 'production'
                ? '.env.production'
                : '.env.development',
            expandVariables: true,
        }),
        PrismaModule,
        AuthModule,
        UploadModule,
        ClubsModule
    ],
})
export class AppModule {}