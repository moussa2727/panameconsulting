import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email de l\'utilisateur' })
    @IsEmail()
    @IsNotEmpty({ message: 'L\'email est requis' })
    email: string;

    @ApiProperty({ example: 'password123', description: 'Mot de passe' })
    @IsString()
    @IsNotEmpty({ message: 'Le mot de passe est requis' })
    password: string;
}