// update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { RegisterDto } from './register.dto';

export class UpdateUserDto extends PartialType(RegisterDto) {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  // Supprimer les autres champs ou les rendre non modifiables
  @IsOptional()
  firstName?: never;

  @IsOptional()
  lastName?: never;

  @IsOptional()
  role?: never;

  @IsOptional()
  isActive?: never;

  @IsOptional()
  password?: never;
}