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
            tls: {
                rejectUnauthorized: false,
            },
        });
    }

    async sendVerificationEmail(to: string, name: string, token: string) {
        console.log('========== MAIL SERVICE DEBUG ==========');
        console.log('1. Начинаем отправку письма на:', to);
        console.log('2. Переменные окружения (Render):', {
            host: this.configService.get('MAIL_HOST'),
            port: this.configService.get('MAIL_PORT'),
            user: this.configService.get('MAIL_USER'),
            from: this.configService.get('MAIL_FROM'),
            hasPassword: !!this.configService.get('MAIL_PASSWORD'),
            clientUrl: this.configService.get('CLIENT_URL'),
        });

        const clientUrl = this.configService.get('CLIENT_URL');
        const link = `${clientUrl}/auth/verify-email?_d=${token}`;
        console.log('3. Ссылка для подтверждения:', link);

        try {
            const templatePath = path.join(__dirname, 'templates', 'verification.html');
            console.log('4. Путь к шаблону:', templatePath);

            const templateSource = fs.readFileSync(templatePath, 'utf8');
            console.log('5. Шаблон прочитан, длина:', templateSource.length);

            const template = handlebars.compile(templateSource);
            const html = template({ name, link });
            console.log('6. HTML сгенерирован');

            console.log('7. Пытаюсь отправить письмо с таймаутом 10 секунд...');

            // Создаём обещание с таймаутом
            const sendPromise = this.transporter.sendMail({
                from: `"Clubs Network" <${this.configService.get('MAIL_FROM')}>`,
                to,
                subject: 'Подтверждение email',
                html,
            });

            // Гонка между отправкой и таймаутом
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('TIMEOUT: Отправка письма заняла больше 10 секунд')), 10000);
            });

            const info = await Promise.race([sendPromise, timeoutPromise]);

            console.log('8. ПИСЬМО УСПЕШНО ОТПРАВЛЕНО!');
            console.log('9. Ответ от SMTP:', info);
            console.log('========================================');

        } catch (error) {
            console.log('❌❌❌ ОШИБКА В MAIL SERVICE ❌❌❌');
            console.log('Тип ошибки:', error.name);
            console.log('Сообщение:', error.message);
            if (error.code) console.log('Код ошибки:', error.code);
            if (error.command) console.log('Команда:', error.command);
            if (error.response) console.log('Ответ сервера:', error.response);
            console.log('========================================');

            // Важно! Пробрасываем ошибку дальше, чтобы запрос упал и мы увидели её в ответе
            throw new Error(`Ошибка отправки письма: ${error.message}`);
        }
    }
}