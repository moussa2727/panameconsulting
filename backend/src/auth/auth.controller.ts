import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { User, UserRole } from '../schemas/user.schema';
import { LocalAuthGuard } from '../shared/guards/local-auth.guard';
import { ThrottleGuard } from '../shared/guards/throttle.guard';
import { LoggingInterceptor } from '../shared/interceptors/logging.interceptor';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RevokedTokenService } from './revoked-token.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { RolesGuard } from '../shared/guards/roles.guard';
import { MailService } from '@/mail/mail.service';

// Définition d'une interface étendue pour Request avec cookies
interface CustomRequest extends Request {
  cookies?: {
    refresh_token?: string;
  };
}

@Controller('auth')
@UseInterceptors(LoggingInterceptor)
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private mailService: MailService
  ) { }

  @UseGuards(ThrottleGuard, LocalAuthGuard)
  @Post('login')
  async login(@Request() req: { user: User }, @Res() res: Response) {
    try {
      const result = await this.authService.login(req.user);
        
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true, // ← INVISIBLE côté JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.json({
        accessToken: result.accessToken,
        user: result.user,
        message: 'Connexion réussie'
      });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'Échec de l\'authentification',
          message: error.message,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  

  @Post('refresh')
  async refresh(@Req() req: CustomRequest, @Body() body: any, @Res() res: Response) {
    try {
      // Chercher le refreshToken dans le corps OU dans les cookies
      const refreshToken = body?.refreshToken || req.cookies?.refresh_token;
      
      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token manquant');
      }

      const result = await this.authService.refresh(refreshToken);
      
      return res.json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      throw new UnauthorizedException('Refresh token invalide');
    }
  }

  @Get('validate-token')
  @UseGuards(JwtAuthGuard)
  async validateToken(@Request() req: any) {
    const token = req.headers.authorization?.split(' ')[1];
    const isValid = await this.authService.validateToken(token);
    return { valid: isValid };
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    try {
      return await this.authService.register(registerDto);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Échec de l\'inscription',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any, @Res() res: Response) {
    const token = (req.headers as any).authorization?.split(' ')[1] || '';
    await this.authService.logoutWithSessionDeletion(req.user.sub, token);
    
    // Clear the refresh token cookie
    res.clearCookie('refresh_token');
    
    return res.json({ message: 'Déconnexion réussie' });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-automatic')
  async logoutAutomatic(@Request() req: any) {
    const userId = req.user.sub;
    await this.authService.logoutUser(userId, 'Logout automatique');
    return { message: 'Déconnexion automatique effectuée' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('cleanup-sessions')
  async cleanupSessions() {
    await this.authService.cleanupExpiredSessions();
    return { message: 'Sessions expirées nettoyées' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async systemWideLogout() {
    return this.authService.logoutAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    const user = await this.authService.getProfile(req.user.sub);
    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isAdmin: user.role === UserRole.ADMIN,
      phone: user.phone,
      isActive: user.isActive
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      await this.authService.sendPasswordResetEmail(forgotPasswordDto.email);
      return { message: 'Email de réinitialisation envoyé' };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Échec de l\'envoi de l\'email',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      await this.authService.resetPassword(
        resetPasswordDto.token,
        resetPasswordDto.newPassword
      );
      return { message: 'Mot de passe réinitialisé avec succès' };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Échec de la réinitialisation',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('update-password')
  async updatePassword(@Request() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    try {
      await this.usersService.updatePassword(req.user.sub, {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        confirmNewPassword: body.newPassword
      });
      return { message: 'Mot de passe mis à jour avec succès' };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Échec de la mise à jour du mot de passe',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('health')
  async checkHealth() {
    const mongoOk = await this.usersService.checkDatabaseConnection();
    const emailOk = await this.mailService.checkConnection();
    
    return {
      status: mongoOk && emailOk ? 'OK' : 'Degraded',
      components: {
        database: mongoOk ? 'OK' : 'DOWN',
        email: emailOk ? 'OK' : 'DOWN',
      },
      timestamp: new Date(),
    };
  }

  @Get('maintenance-status')
  public async getMaintenanceStatus() {     
    try {
      return this.usersService.getMaintenanceStatus();
    } catch (error) {
        const isMaintenance = await this.usersService.isMaintenanceMode();
        return {
          isActive: isMaintenance,
          logoutUntil: isMaintenance ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
        };
      }
  }
}