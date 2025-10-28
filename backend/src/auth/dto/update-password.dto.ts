import { IsString, MinLength } from 'class-validator';
import { Match } from '../../shared/decorators/match.decorator';

export class UpdatePasswordDto {
   @IsString()
   @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
   currentPassword: string;

   @IsString()
   @MinLength(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' })
   newPassword: string;

   @IsString()
   @MinLength(8)
   @Match('newPassword', { message: 'Les mots de passe ne correspondent pas' })
   confirmNewPassword: string;
}