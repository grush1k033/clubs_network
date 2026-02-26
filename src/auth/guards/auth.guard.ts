import { AuthGuard } from "@nestjs/passport";
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const result = await super.canActivate(context);
            return result as boolean;
        } catch (error) {
            throw error;
        }
    }
}