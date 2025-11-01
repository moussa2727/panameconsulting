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
    UseGuards,
    BadRequestException,
    ForbiddenException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { ProcedureService } from './procedure.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { UserRole } from '../schemas/user.schema';

@ApiTags('Procedures')
@Controller('procedures')
export class ProcedureController {
    constructor(private readonly procedureService: ProcedureService) {}

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Créer une nouvelle procédure' })
    @ApiResponse({ status: 201, description: 'Procédure créée avec succès' })
    async create(@Body() createDto: CreateProcedureDto) {
        return this.procedureService.create(createDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Récupérer toutes les procédures (admin)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'email', required: false, type: String })
    async findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('email') email?: string
    ) {
        if (page < 1) throw new BadRequestException('Le numéro de page doit être supérieur à 0');
        if (limit < 1 || limit > 100) throw new BadRequestException('La limite doit être entre 1 et 100');
        
        return this.procedureService.findAll(page, limit, email);
    }

    @Get('user')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Récupérer les procédures de l\'utilisateur connecté' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getUserProcedures(
        @Req() req: any,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10
    ) {
        return this.procedureService.findAll(page, limit, req.user.email);
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Récupérer les statistiques des procédures' })
    async getStats() {
        return this.procedureService.getStats();
    }

    @Get('dashboard-stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Récupérer les statistiques du dashboard' })
    async getDashboardStats() {
        return this.procedureService.getDashboardStats();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Récupérer une procédure par ID' })
    async findOne(@Param('id') id: string, @Req() req: any) {
        const procedure = await this.procedureService.findOne(id);
        
        // Vérifier les permissions
        if (procedure.email !== req.user.email && req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Accès non autorisé');
        }

        return procedure;
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Mettre à jour une procédure' })
    async update(@Param('id') id: string, @Body() updateDto: UpdateProcedureDto) {
        return this.procedureService.update(id, updateDto);
    }

    @Put(':id/steps/:stepName')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Mettre à jour une étape de procédure' })
    async updateStep(
        @Param('id') id: string,
        @Param('stepName') stepName: string,
        @Body() updateDto: UpdateStepDto
    ) {
        return this.procedureService.updateStep(id, stepName, updateDto);
    }

    @Put(':id/cancel')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Annuler sa propre procédure' })
    async cancelOwn(
        @Param('id') id: string,
        @Req() req: any,
        @Body('reason') reason?: string
    ) {
        return this.procedureService.cancelByUser(id, req.user.email, reason);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Supprimer une procédure (soft delete)' })
    async remove(
        @Param('id') id: string,
        @Body('reason') reason?: string
    ) {
        return this.procedureService.softRemove(id, reason);
    }

    @Put(':id/restore')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Restaurer une procédure supprimée' })
    async restore(@Param('id') id: string) {
        return this.procedureService.restoreProcedure(id);
    }
}