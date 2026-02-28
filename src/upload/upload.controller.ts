import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) {}

    @Post('image')
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Файл не передан');
        }

        try {
            const imageUrl = await this.uploadService.uploadImage(file);
            return {
                message: 'Изображение успешно загружено',
                url: imageUrl,
            };
        } catch (error) {
            throw new BadRequestException('Ошибка при загрузке изображения');
        }
    }
}