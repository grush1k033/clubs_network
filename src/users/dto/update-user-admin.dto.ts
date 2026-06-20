import { IsEmail, IsOptional, IsString, IsEnum} from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

export class UpdateUserAdminDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsEnum(Role)
    @IsOptional()
    role?: Role;

    @IsOptional()
    clubId?: any;
}