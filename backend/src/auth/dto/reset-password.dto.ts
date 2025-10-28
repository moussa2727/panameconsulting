import { IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';
import { Match } from '../../shared/decorators/match.decorator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
  })
  newPassword: string;

  @IsString()
  @MinLength(8)
  @Match('newPassword', { message: 'Les mots de passe ne correspondent pas' })
  confirmPassword: string;
}