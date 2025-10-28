import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'Email est obligatoire' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Message est obligatoire' })
  @MinLength(10, { message: 'Message trop court (min. 10 caractères)' })
  message: string;
}