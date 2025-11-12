import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  BadRequestException
} from '@nestjs/common';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateUserDto } from '../auth/dto/update-user.dto';
import { UserRole } from '../schemas/user.schema';
import { Roles } from '../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { UsersService } from './users.service';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
    telephone: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // === ENDPOINTS ADMIN ===
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createUserDto: RegisterDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.usersService.getStats();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleStatus(id);
  }

  @Get('maintenance-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getMaintenanceStatus() {
    return this.usersService.getMaintenanceStatus();
  }

  @Post('maintenance-mode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async setMaintenanceMode(@Body() body: { enabled: boolean }) {
    await this.usersService.setMaintenanceMode(body.enabled);
    return { message: `Mode maintenance ${body.enabled ? 'activé' : 'désactivé'}` };
  }

  @Get('check-access/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async checkUserAccess(@Param('userId') userId: string) {
    const hasAccess = await this.usersService.checkUserAccess(userId);
    return { hasAccess };
  }

  // === ENDPOINTS PUBLIC (Pour l'utilisateur connecté) ===

  @Patch('profile/me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req: RequestWithUser, @Body() updateUserDto: UpdateUserDto) {
    console.log('📝 Mise à jour profil pour:', req.user.userId);
    
    // Validation des données
    if (!updateUserDto.email && !updateUserDto.telephone) {
      throw new BadRequestException('Au moins un champ (email ou téléphone) doit être fourni');
    }

    // Créer un objet avec uniquement les champs autorisés et non vides
    const allowedUpdate: any = {};
    
    if (updateUserDto.email !== undefined && updateUserDto.email.trim() !== '') {
      allowedUpdate.email = updateUserDto.email.trim().toLowerCase();
    }
    
    if (updateUserDto.telephone !== undefined && updateUserDto.telephone.trim() !== '') {
      allowedUpdate.telephone = updateUserDto.telephone.trim();
    }

    // Vérifier qu'au moins un champ est présent après nettoyage
    if (Object.keys(allowedUpdate).length === 0) {
      throw new BadRequestException('Aucune donnée valide à mettre à jour');
    }

    console.log('✅ Données autorisées pour mise à jour:', allowedUpdate);
    
    return this.usersService.update(req.user.userId, allowedUpdate);
  }

  // Nouvel endpoint pour récupérer le profil de l'utilisateur connecté
  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req: RequestWithUser) {
    return this.usersService.findById(req.user.userId);
  }
}