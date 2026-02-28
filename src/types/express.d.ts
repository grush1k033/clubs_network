import { User } from '@prisma/client';

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

// Пустой экспорт, чтобы файл считался модулем
export {};