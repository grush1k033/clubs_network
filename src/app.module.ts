import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from "./prisma/prisma.module";
import { UploadModule } from './upload/upload.module';
import { ClubsModule } from './clubs/clubs.module';
import { TariffsModule } from './tariffs/tariffs.module';
import {UsersModule} from "./users/users.module";
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';

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
        ClubsModule,
        TariffsModule,
        UsersModule,
        PaymentsModule,
        MailModule
    ],
})
export class AppModule {}