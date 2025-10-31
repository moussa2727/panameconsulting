import { 
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { 
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { ProcedureService } from './procedure.service';
import { UserRole } from '../schemas/user.schema';

@Controller('procedures')
export class ProcedureController {
  constructor(private readonly procedureService: ProcedureService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createDto: CreateProcedureDto) {
    return this.procedureService.create(createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('email') email?: string
  ) {
    if (page < 1) throw new BadRequestException('Le numéro de page doit être supérieur à 0');
    if (limit < 1 || limit > 100) throw new BadRequestException('La limite doit être entre 1 et 100');
    
    return this.procedureService.findAll(page, limit, email);
  }

  @Get('user/:email')
  @UseGuards(JwtAuthGuard)
  async getUserProcedures(
    @Param('email') email: string,
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    // Vérifier que l'utilisateur accède à ses propres données
    if (req.user.email !== email && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Accès non autorisé');
    }
    
    return this.procedureService.findAll(page, limit, email);
  }

  @Get('current/:id')
  @UseGuards(JwtAuthGuard)
  async getCurrentStep(
    @Param('id') id: string,
    @Req() req: any
  ) {
    const procedure = await this.procedureService.findOne(id);
    
    // Vérifier que l'utilisateur accède à sa propre procédure
    if (procedure.email !== req.user.email && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Accès non autorisé');
    }

    return this.procedureService.getCurrentStep(id);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.procedureService.getStats();
  }

  @Get('dashboard-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getDashboardStats() {
    return this.procedureService.getDashboardStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req: any) {
    const procedure = await this.procedureService.findOne(id);
    
    // Vérifier que l'utilisateur accède à sa propre procédure ou est admin
    if (procedure.email !== req.user.email && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Accès non autorisé');
    }

    return procedure;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateDto: UpdateProcedureDto) {
    return this.procedureService.update(id, updateDto);
  }

  @Put(':id/steps/:stepName')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateStep(
    @Param('id') id: string,
    @Param('stepName') stepName: string,
    @Body() updateDto: UpdateStepDto
  ) {
    return this.procedureService.updateStep(id, stepName, updateDto);
  }

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOwn(
    @Param('id') id: string,
    @Body('email') email: string,
    @Body('reason') reason?: string
  ) {
    return this.procedureService.cancelByUser(id, email, reason);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @Body('reason') reason?: string
  ) {
    return this.procedureService.softRemove(id, reason);
  }

  @Put(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async restore(@Param('id') id: string) {
    return this.procedureService.restoreProcedure(id);
  }

  @Get('progress/:email')
  @UseGuards(JwtAuthGuard)
  async getInProgressProcedures(
    @Param('email') email: string,
    @Req() req: any
  ) {
    // Vérifier que l'utilisateur accède à ses propres données
    if (req.user.email !== email && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Accès non autorisé');
    }

    return this.procedureService.findByEmailAndStatus(email, 'En cours');
  }
}