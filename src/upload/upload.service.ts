import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
    constructor(private configService: ConfigService) {
        // Инициализация Cloudinary
        cloudinary.config({
            cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
        });
    }

    async uploadImage(
        file: Express.Multer.File,
        folder: string = 'clubs',
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `clubs-network/${folder}`,
                    resource_type: 'auto',
                    transformation: [
                        { width: 1000, height: 1000, crop: 'limit' },
                        { quality: 'auto' },
                        { fetch_format: 'auto' },
                    ],
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result.secure_url);
                },
            );

            uploadStream.end(file.buffer);
        });
    }

    async deleteImage(publicId: string): Promise<void> {
        await cloudinary.uploader.destroy(publicId);
    }

    extractPublicIdFromUrl(url: string): string | null {
        const matches = url.match(/\/v\d+\/(.+)\./);
        return matches ? matches[1] : null;
    }
}