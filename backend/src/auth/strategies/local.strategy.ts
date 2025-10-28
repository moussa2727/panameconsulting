import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Utilise 'email' comme champ d'identification
      passwordField: 'password', // Champ par défaut, peut être explicité
    });
  }

  /**
   * Valide les credentials de l'utilisateur
   * @param email - Email de l'utilisateur
   * @param password - Mot de passe en clair (sera hashé et comparé)
   * @returns User - L'utilisateur validé
   * @throws UnauthorizedException - Si les credentials sont invalides
   */
  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    
    return user; // Seras disponible dans req.user
  }
}