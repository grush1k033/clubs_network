import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private oAuth2Client: OAuth2Client;

    constructor(private configService: ConfigService) {
        this.initializeOAuth2Client();
    }

    private initializeOAuth2Client() {
        const clientId = this.configService.get('GMAIL_CLIENT_ID');
        const clientSecret = this.configService.get('GMAIL_CLIENT_SECRET');
        const redirectUri = this.configService.get('GMAIL_REDIRECT_URI');

        if (!clientId || !clientSecret || !redirectUri) {
            this.logger.error('GMAIL OAuth2 credentials are missing');
            throw new Error('GMAIL OAuth2 credentials are missing');
        }

        this.oAuth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri,
        );

        const refreshToken = this.configService.get('GMAIL_REFRESH_TOKEN');
        if (refreshToken) {
            this.oAuth2Client.setCredentials({ refresh_token: refreshToken });
            this.logger.log('GMAIL OAuth2 client initialized with refresh token');
        } else {
            this.logger.warn('GMAIL_REFRESH_TOKEN is missing');
        }
    }

    async sendVerificationEmail(to: string, name: string, token: string) {
        this.logger.log(`Начинаем отправку письма на: ${to}`);

        try {
            // Получаем свежий access token
            const accessTokenResponse = await this.oAuth2Client.getAccessToken();
            const accessToken = accessTokenResponse.token;

            if (!accessToken) {
                throw new Error('Не удалось получить access token');
            }

            this.logger.log('Access token получен успешно');

            // Создаём транспорт Nodemailer с OAuth2
            const transport = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: this.configService.get('GMAIL_USER'),
                    clientId: this.configService.get('GMAIL_CLIENT_ID'),
                    clientSecret: this.configService.get('GMAIL_CLIENT_SECRET'),
                    refreshToken: this.configService.get('GMAIL_REFRESH_TOKEN'),
                    accessToken: accessToken,
                },
            } as any);

            const clientUrl = this.configService.get('CLIENT_URL');
            const link = `${clientUrl}/auth/verify-email?_d=${token}`;
            this.logger.log(`Ссылка для подтверждения: ${link}`);

            // Читаем шаблон
            const templatePath = path.join(__dirname, 'templates', 'verification.html');
            const templateSource = fs.readFileSync(templatePath, 'utf8');
            const template = handlebars.compile(templateSource);
            const html = template({ name, link });

            // Отправляем письмо
            const mailOptions = {
                from: `"Clubs Network" <${this.configService.get('GMAIL_USER')}>`,
                to,
                subject: 'Подтверждение email',
                html,
            };

            const info = await transport.sendMail(mailOptions);
            this.logger.log(`Письмо успешно отправлено: ${info.messageId}`);
            return info;

        } catch (error) {
            this.logger.error('Ошибка при отправке письма:', error);
            throw new Error(`Ошибка отправки письма: ${error.message}`);
        }
    }

    async sendTestEmail(to: string) {
        return this.sendVerificationEmail(to, 'Тест', 'test-token-123');
    }
}