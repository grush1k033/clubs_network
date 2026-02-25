import {Injectable, UnauthorizedException, ConflictException, NotFoundException} from '@nestjs/common';
import { JwtService  } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {hash, verify} from "argon2";
import {ConfigService} from "@nestjs/config";
import {JwtPayload} from "./interfaces/jwt.interface";
import type { Response } from 'express';
import type { Request } from 'express';
import {isDev} from "../utils/is-dev.util";

@Injectable()
export class AuthService {
    private readonly JWT_ACCESS_TOKEN_TTL: string;
    private readonly JWT_REFRESH_TOKEN_TTL: string;
    private readonly COOKIE_DOMAIN: string;
    constructor(
        private readonly prismaService: PrismaService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
    ) {
        this.JWT_ACCESS_TOKEN_TTL = configService.getOrThrow<string>('JWT_ACCESS_TOKEN_TTL')
        this.JWT_REFRESH_TOKEN_TTL = configService.getOrThrow<string>('JWT_REFRESH_TOKEN_TTL')
        this.COOKIE_DOMAIN = configService.getOrThrow<string>('COOKIE_DOMAIN')
    }
    async register(res: Response, dto: RegisterDto) {
        const  { name, email, password} = dto;

        const existUser = await this.prismaService.user.findUnique({
            where: {
                email
            }
        })

        if(existUser) {
            throw new ConflictException('Пользователь с такой почтой уже существует')
        }

        const user = await this.prismaService.user.create({
            data: {
                name,
                email,
                password: await hash(password)
            }
        })

        return this.auth(res, user.id)
    }

    async login(res: Response, dto:LoginDto) {
        const {email, password} = dto;

        const user = await this.prismaService.user.findUnique({
            where: {
                email
            },
            select: {
                id: true,
                password: true
            }
        })

        if(!user) {
            throw new NotFoundException('Пользователь не найден')
        }

        const isValidPassword = await verify(user.password, password);

        if(!isValidPassword) {
            throw new NotFoundException('Пользователь не найден')
        }

        return this.auth(res, user.id)
    }

    async refresh(req: Request, res: Response) {
        const refreshToken = req.cookies['refreshToken'];

        if(!refreshToken) {
            throw new  UnauthorizedException('Недействительный refresh-токен')
        }

        const payload: JwtPayload = await this.jwtService.verifyAsync(refreshToken);

        if (payload) {
            const user = await this.prismaService.user.findUnique({
                where: {
                    id: payload.id,
                },
                select: {
                    id: true
                }
            })

            if(!user) {
                throw new NotFoundException('Пользователь не найден')
            }

            return this.auth(res, user.id)
        }
    }

    async logout(res: Response) {
        this.setCookie(res, 'refreshToken', new Date(0))
    }

    async validate(id: number) {
        const user = await this.prismaService.user.findUnique({
            where: {
                id: id
            }
        })

        if(!user) {
            throw new NotFoundException('Пользователь не найден')
        }
        return user;
    }

    private auth(res: Response, id: number) {
        const {accessToken, refreshToken} = this.generateTokens(id);

        this.setCookie(
            res,
            refreshToken,
            new Date(Date.now() + 1000 * 60 * 60 *24 *7));

        return {accessToken}
    }

    private generateTokens(id: number) {
        const payload: JwtPayload = { id };

        const accessToken = this.jwtService.sign(payload,{
            expiresIn: this.JWT_ACCESS_TOKEN_TTL as any
        })

        const refreshToken = this.jwtService.sign(payload,{
            expiresIn: this.JWT_REFRESH_TOKEN_TTL as any
        });

        return {
            accessToken,
            refreshToken
        }
    }

    private setCookie(res: Response, value: string, expires: Date) {
        const isDevelopment = this.configService.get('NODE_ENV') === 'development';

        res.cookie('refreshToken', value, {
            httpOnly: true,
            domain: isDevelopment ? undefined : this.COOKIE_DOMAIN,
            expires,
            secure: !isDevelopment,
            sameSite: isDevelopment ? 'lax' : 'none',
            path: '/'
        });
    }
}

