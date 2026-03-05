import {Controller, Post, Body, HttpCode, HttpStatus, Res, Req, Get, UseGuards, Query} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Response } from 'express';
import type { Request } from 'express';
import {
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation, ApiUnauthorizedResponse
} from "@nestjs/swagger";
import {AuthResponse} from "./dto/auth.dto";
import {Authorization} from "./decorators/authorization.decorator";
import {Authorized} from "./decorators/authorized.decorator";
import {User} from "@prisma/client";

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}
    @ApiOperation({
        summary: 'Создание аккаунта',
        description: 'Создаёт новый аккаунт пользователя'
    })
    @ApiOkResponse({type: AuthResponse})
    @ApiBadRequestResponse({
        description: 'Неккоретные входные данные'
    })
    @ApiConflictResponse({
        description: 'Пользователь с такой почтой уже существует'
    })
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(
        @Res({passthrough: true}) res: Response,
        @Body() dto: RegisterDto
    ) {
        return await this.authService.register(res, dto);
    }

    @ApiOperation({
        summary: 'Вход в систему ',
        description: 'Авторизует пользователя и выдаёт токен доступа'
    })
    @ApiOkResponse({type: AuthResponse})
    @ApiBadRequestResponse({
        description: 'Неккоретные входные данные'
    })
    @ApiNotFoundResponse({
        description: 'Пользователь не найден'
    })
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Res({passthrough: true}) res: Response,
        @Body() dto: LoginDto
    ){
        return await this.authService.login(res, dto);
    }

    @ApiOperation({
        summary: 'Обновление токена',
        description: 'Генерирует новый токен доступа'
    })
    @ApiOkResponse({type: AuthResponse})
    @ApiUnauthorizedResponse({
        description: 'Недействительный refresh-токен'
    })
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Req() req: Request,
        @Res({passthrough: true}) res: Response,
    ){
        return await  this.authService.refresh(req, res);
    }

    @ApiOperation({
        summary: 'Выход из системы'
    })
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Res({passthrough: true}) res: Response){
        return await  this.authService.logout(res);
    }

    @Authorization()
    @Get('me')
    @HttpCode(HttpStatus.OK)
    async me(@Authorized() user: User) {
        return user;
    }

    @Get('verify-email')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Подтверждение email' })
    @ApiOkResponse({ type: AuthResponse })
    @ApiUnauthorizedResponse({ description: 'Недействительная или устаревшая ссылка' })
    async verifyEmail(
        @Query('_d') token: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        return this.authService.verifyEmail(token, res);
    }

    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Повторная отправка письма подтверждения' })
    async resendVerification(@Body('email') email: string) {
        return this.authService.resendVerificationEmail(email);
    }
}