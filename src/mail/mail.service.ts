import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private oAuth2Client: OAuth2Client;
    private gmail;

    constructor(private configService: ConfigService) {
        this.initializeOAuth2Client();
    }

    private initializeOAuth2Client() {
        const clientId = this.configService.get('GMAIL_CLIENT_ID');
        const clientSecret = this.configService.get('GMAIL_CLIENT_SECRET');
        const redirectUri = this.configService.get('GMAIL_REDIRECT_URI');

        this.oAuth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri,
        );

        const refreshToken = this.configService.get('GMAIL_REFRESH_TOKEN');
        this.oAuth2Client.setCredentials({ refresh_token: refreshToken });

        this.gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
    }

    async sendVerificationEmail(to: string, name: string, token: string) {
        this.logger.log(`Начинаем отправку письма на: ${to}`);

        try {
            await this.oAuth2Client.getAccessToken();
            this.logger.log('Access token обновлён');

            const serverUrl = this.configService.get('SERVER_URL');
            const link = `${serverUrl}/auth/verify-email?_d=${token}`;

            const templatePath = path.join(__dirname, 'templates', 'verification.html');
            const templateSource = fs.readFileSync(templatePath, 'utf8');
            const template = handlebars.compile(templateSource);
            const html = template({ name, link });

            const utf8Subject = `=?utf-8?B?${Buffer.from('Подтверждение email').toString('base64')}?=`;
            const messageParts = [
                `From: "Clubs Network" <${this.configService.get('GMAIL_USER')}>`,
                `To: ${to}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                `Subject: ${utf8Subject}`,
                '',
                html,
            ];
            const message = messageParts.join('\n');

            // Кодируем в base64URL
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const res = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });

            this.logger.log(`Письмо успешно отправлено! ID: ${res.data.id}`);
            return res.data;

        } catch (error) {
            this.logger.error('Детальная ошибка Gmail API:', {
                message: error.message,
                code: error.code,
                status: error.status,
                details: error.response?.data,
            });
            throw new Error(`Ошибка отправки письма: ${error.message}`);
        }
    }

    async sendPasswordResetEmail(to: string, name: string, resetLink: string) {
        this.logger.log(`Отправка письма для сброса пароля на: ${to}`);

        try {
            await this.oAuth2Client.getAccessToken();

            const templatePath = path.join(__dirname, 'templates', 'reset-password.html');
            const templateSource = fs.readFileSync(templatePath, 'utf8');
            const template = handlebars.compile(templateSource);
            const html = template({ name, resetLink });

            const utf8Subject = `=?utf-8?B?${Buffer.from('Сброс пароля').toString('base64')}?=`;
            const messageParts = [
                `From: "Clubs Network" <${this.configService.get('GMAIL_USER')}>`,
                `To: ${to}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                `Subject: ${utf8Subject}`,
                '',
                html,
            ];
            const message = messageParts.join('\n');

            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const res = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: { raw: encodedMessage },
            });

            this.logger.log(`Письмо отправлено! ID: ${res.data.id}`);
            return res.data;

        } catch (error) {
            this.logger.error('Ошибка отправки письма:', error);
            throw new Error(`Ошибка отправки письма: ${error.message}`);
        }
    }
}