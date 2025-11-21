import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Patch,
    Post,
    Req,
    Request,
    Res,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { LocalAuthGuard } from '../shared/guards/local-auth.guard';
import { ThrottleGuard } from '../shared/guards/throttle.guard';
import { LoggingInterceptor } from '../shared/interceptors/logging.interceptor';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';

interface CustomRequest extends Request {
    cookies?: {
        refresh_token?: string;
    };
}

@ApiTags('Authentication')
@Controller('auth')
@UseInterceptors(LoggingInterceptor)
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService
    ) { }

   // Dans auth.controller.ts - UTILISATION CORRECTE
@Post('login')
@UseGuards(ThrottleGuard, LocalAuthGuard) // ✅ Utilisation correcte du guard
@ApiOperation({ summary: 'Connexion utilisateur' })
@ApiResponse({ status: 200, description: 'Connexion réussie' })
@ApiResponse({ status: 401, description: 'Identifiants invalides' })
async login(
    @Body() loginDto: LoginDto,
    @Request() req: { user: any }, // ✅ req.user est rempli par LocalAuthGuard
    @Res() res: Response
) {
    const result = await this.authService.login(req.user);
    
    // Configuration des cookies
    const cookieOptions: any = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.NODE_ENV === 'production' ? '.panameconsulting.com' : undefined
    };

    res.cookie('refresh_token', result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
    });

    res.cookie('access_token', result.accessToken, {
        ...cookieOptions,
        httpOnly: false,
        maxAge: 15 * 60 * 1000 // 15 minutes
    });

    return res.json({
        accessToken: result.accessToken,
        user: result.user,
        message: 'Connexion réussie'
    });
}

   @Post('refresh')
@ApiOperation({ summary: 'Rafraîchir le token' })
@ApiResponse({ status: 200, description: 'Token rafraîchi' })
@ApiResponse({ status: 401, description: 'Refresh token invalide' })
async refresh(@Req() req: CustomRequest, @Body() body: any, @Res() res: Response) {
  console.log('🔄 Requête de rafraîchissement reçue');
  
  // ✅ Essayer multiple sources pour le refresh token
  const refreshToken = body?.refreshToken || req.cookies?.refresh_token;
  
  if (!refreshToken) {
    console.warn('❌ Refresh token manquant');
    return res.status(401).json({ message: 'Refresh token manquant' });
  }

  console.log('🔐 Refresh token trouvé, longueur:', refreshToken.length);

  try {
    const result = await this.authService.refresh(refreshToken);

    if ((result as any)?.sessionExpired) {
      console.log('🔒 Session expirée - nettoyage cookies');
      res.clearCookie('refresh_token');
      res.clearCookie('access_token');
      return res.json({ loggedOut: true });
    }

    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.panameconsulting.com' : undefined
    };

    // ✅ Mettre à jour le refresh token si un nouveau est fourni
    if (result.refreshToken) {
      res.cookie('refresh_token', result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
      });
      console.log('✅ Nouveau refresh token défini');
    }

    // ✅ Mettre à jour le access token
    res.cookie('access_token', result.accessToken, {
      ...cookieOptions,
      httpOnly: false,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    console.log('✅ Tokens rafraîchis avec succès');

    return res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });

  } catch (error: any) {
    console.error('❌ Erreur rafraîchissement:', error.message);
    
    // ✅ Nettoyer les cookies en cas d'erreur
    res.clearCookie('refresh_token');
    res.clearCookie('access_token');
    
    return res.status(401).json({ 
      message: 'Refresh token invalide',
      loggedOut: true 
    });
  }
}

    @Post('register')
    @ApiOperation({ summary: 'Inscription utilisateur' })
    @ApiResponse({ status: 201, description: 'Utilisateur créé' })
    @ApiResponse({ status: 400, description: 'Données invalides' })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Déconnexion' })
    async logout(@Request() req: any, @Res() res: Response) {
        const token = req.headers.authorization?.split(' ')[1] || '';
        await this.authService.logoutWithSessionDeletion(req.user.sub, token);
        
        res.clearCookie('refresh_token');
        res.clearCookie('access_token');
        
        return res.json({ message: 'Déconnexion réussie' });
    }

    @Post('logout-all')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Déconnexion de tous les utilisateurs (sauf admin)' })
    async logoutAll(@Request() req: any, @Res() res: Response) {
        try {
            const result = await this.authService.logoutAll();            
            return res.json({ 
                message: result.message,
                stats: result.stats
            });
        } catch (error) {
            console.error('Erreur logoutAll:', error);
            return res.status(500).json({ message: 'Erreur lors de la déconnexion globale' });
        }
    }

   
@Get('me')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Récupérer le profil utilisateur' })
async getProfile(@Request() req: any) {
    
    // ✅ Essayer différents chemins pour l'ID utilisateur
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    
    if (!userId) {
        console.error('❌ ERREUR: Aucun ID utilisateur trouvé dans req.user');
        console.error('❌ Structure de req.user .');
        throw new BadRequestException('ID utilisateur manquant dans le token');
    }
    
    console.log('✅ ID utilisateur trouvé:', userId);
    
    try {
        const user = await this.authService.getProfile(userId);
        
        return {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isAdmin: user.role === UserRole.ADMIN,
            telephone: user.telephone,
            isActive: user.isActive
        };
    } catch (error) {
        console.error('❌ Erreur dans getProfile:', error);
        throw error;
    }
}

    @Patch('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Mettre à jour le profil utilisateur' })
    async updateProfile(
        @Request() req: any,
        @Body() updateUserDto: UpdateUserDto
    ) {
        const updatedUser = await this.usersService.update(req.user.sub, updateUserDto);
        return {
            id: updatedUser._id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            role: updatedUser.role,
            telephone: updatedUser.telephone,
            isActive: updatedUser.isActive
        };
    }

    @Post('forgot-password')
    @ApiOperation({ summary: 'Demande de réinitialisation de mot de passe' })
    @ApiResponse({ status: 200, description: 'Email envoyé si l\'utilisateur existe' })
    @ApiResponse({ status: 400, description: 'Données invalides' })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        await this.authService.sendPasswordResetEmail(forgotPasswordDto.email);
        return { 
            message: 'Si votre email est enregistré, vous recevrez un lien de réinitialisation' 
        };
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Réinitialiser le mot de passe' })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        await this.authService.resetPassword(
            resetPasswordDto.token,
            resetPasswordDto.newPassword
        );
        return { message: 'Mot de passe réinitialisé avec succès' };
    }

   @Post('update-password')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Mettre à jour le mot de passe' })
    async updatePassword(
    @Request() req: any,
    @Body() body: { currentPassword: string; newPassword: string; confirmNewPassword: string }
    ) {
    // Validation de la confirmation
    if (body.newPassword !== body.confirmNewPassword) {
        throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    await this.usersService.updatePassword(req.user.sub, {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        confirmNewPassword: body.confirmNewPassword
    });
    
    return { message: 'Mot de passe mis à jour avec succès' };
    }
}