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
  UseGuards
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
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createUserDto: RegisterDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

@Get('stats')
@Roles(UserRole.ADMIN)
async getStats() {
  return this.usersService.getStats();
}

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Patch(':id/toggle-status')
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

  @Get('check-access')
  @UseGuards(JwtAuthGuard)
  async checkCurrentUserAccess(@Request() req: RequestWithUser) {
    const hasAccess = await this.usersService.checkUserAccess(req.user.userId);
    return { hasAccess };
  }

  // Méthodes accessibles à tous les utilisateurs authentifiés
  @Get('profile/me')
  getProfile(@Request() req: RequestWithUser) {
    return this.usersService.findById(req.user.userId);
  }

  @Patch('profile/me')
  updateProfile(@Request() req: RequestWithUser, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.userId, updateUserDto);
  }
}