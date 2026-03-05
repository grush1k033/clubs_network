import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('MAIL_HOST'),
            port: this.configService.get('MAIL_PORT'),
            secure: false, // true для 465, false для других портов
            auth: {
                user: this.configService.get('MAIL_USER'),
                pass: this.configService.get('MAIL_PASSWORD'),
            },
        });
    }

    async sendVerificationEmail(to: string, name: string, token: string) {
        const clientUrl = this.configService.get('CLIENT_URL');
        const link = `${clientUrl}/auth/verify-email?_d=${token}`;

        // Читаем и компилируем шаблон
        const templatePath = path.join(__dirname, 'templates', 'verification.html');
        const templateSource = fs.readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(templateSource);
        const html = template({ name, link });

        await this.transporter.sendMail({
            from: `"Clubs Network" <${this.configService.get('MAIL_FROM')}>`,
            to,
            subject: 'Подтверждение email',
            html,
        });
    }
}