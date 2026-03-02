import { Module } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { ClubsController } from './clubs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import {UploadModule} from "../upload/upload.module";

@Module({
    imports: [PrismaModule, UploadModule],
    controllers: [ClubsController],
    providers: [ClubsService],
    exports: [ClubsService],
})
export class ClubsModule {}