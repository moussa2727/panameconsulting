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
    ForbiddenException,
    UnauthorizedException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { ProcedureService } from './procedure.service';
import { CreateProcedureDto, CancelProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { UserRole } from '../schemas/user.schema';

@ApiTags('')
@Controller('')
@UseGuards(JwtAuthGuard)
export class ProcedureController {
    constructor(private readonly procedureService: ProcedureService) {}

    // ==================== ADMIN ONLY ====================
    
    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Créer une procédure depuis un rendez-vous éligible' })
    async createFromRendezvous(@Body() createDto: CreateProcedureDto) {
        return this.procedureService.createFromRendezvous(createDto);
    }

    @Get('admin/procedures/all')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Lister toutes les procédures (Admin)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'email', required: false, type: String })
    async getAllProcedures(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('email') email?: string
    ) {
        if (page < 1) throw new BadRequestException('Le numéro de page doit être supérieur à 0');
        if (limit < 1 || limit > 100) throw new BadRequestException('La limite doit être entre 1 et 100');
        
        return this.procedureService.getAllProcedures(page, limit, email);
    }
    
    @Put('admin/procedures/:id/reject')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Rejeter une procédure (Admin)' })
    async rejectProcedure(
        @Param('id') id: string,
        @Body('reason') reason: string
    ) {
        return this.procedureService.rejectProcedure(id, reason);
    }

    @Put('admin/procedures/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Modifier une procédure (Admin)' })
    async updateProcedure(
        @Param('id') id: string,
        @Body() updateDto: UpdateProcedureDto
    ) {
        return this.procedureService.updateProcedure(id, updateDto);
    }

    @Put('admin/procedures/:id/steps/:stepName')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Modifier une étape de procédure (Admin)' })
    async updateProcedureStep(
        @Param('id') id: string,
        @Param('stepName') stepName: string,
        @Body() updateDto: UpdateStepDto
    ) {
        return this.procedureService.updateStep(id, stepName, updateDto);
    }

    @Delete('admin/procedures/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Supprimer une procédure (Soft Delete)' })
    async deleteProcedure(
        @Param('id') id: string,
        @Body('reason') reason?: string
    ) {
        return this.procedureService.softDelete(id, reason);
    }

    @Put('admin/procedures/:id/restore')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Restaurer une procédure supprimée' })
    async restoreProcedure(@Param('id') id: string) {
        return this.procedureService.restoreProcedure(id);
    }

    @Get('admin/procedures/stats')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Statistiques générales des procédures' })
    async getProceduresOverview() {
        return this.procedureService.getProceduresOverview();
    }

    // ==================== USER & ADMIN ====================

    @Get('procedures')
    @ApiOperation({ summary: 'Mes procédures' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getMyProcedures(
        @Req() req: any,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10
    ) {
        if (!req.user?.email) {
            throw new UnauthorizedException('Utilisateur non authentifié');
        }
        return this.procedureService.getUserProcedures(req.user.email, page, limit);
    }

    @Get('procedures/:id')
    @ApiOperation({ summary: 'Détails d\'une procédure' })
    async getProcedureDetails(@Param('id') id: string, @Req() req: any) {
        return this.procedureService.getProcedureDetails(id, req.user);
    }

    @Put('procedures/:id/cancel')
    @ApiOperation({ summary: 'Annuler ma procédure' })
    async cancelMyProcedure(
        @Param('id') id: string,
        @Req() req: any,
        @Body() cancelDto: CancelProcedureDto
    ) {
        return this.procedureService.cancelProcedure(id, req.user.email, cancelDto.reason);
    }

}