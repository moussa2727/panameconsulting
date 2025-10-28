import { 
  Injectable, 
  CanActivate, 
  ExecutionContext, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { email } = request.body;
    
    if (!email) {
      throw new HttpException(
        'Email is required for rate limiting', 
        HttpStatus.BAD_REQUEST
      );
    }

    const key = `login_attempts:${email}`;
    const { attempts, lastAttempt } = await this.authService.getLoginAttempts(key);
    const now = new Date();
    const timeSinceLastAttempt = (now.getTime() - lastAttempt.getTime()) / (1000 * 60); // en minutes

    // Si plus de 5 tentatives dans les dernières 15 minutes
    if (attempts >= 5 && timeSinceLastAttempt < 15) {
      const remainingTime = Math.ceil(15 - timeSinceLastAttempt);
      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too many login attempts',
          message: `Please try again in ${remainingTime} minutes`,
          retryAfter: `${remainingTime} minutes`
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Réinitialiser le compteur si la dernière tentative date de plus de 15 minutes
    if (timeSinceLastAttempt >= 15) {
      await this.authService.resetLoginAttempts(key);
    }

    await this.authService.incrementLoginAttempts(key);
    return true;
  }
}