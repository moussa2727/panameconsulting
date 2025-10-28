// rendez-vous.controller.ts
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
    Req
} from '@nestjs/common';
import { AuthGuard } from '../shared/guards/auth.guard';
import { AdminGuard } from '@/shared/guards/admin.guard';
import { CreateRendezvousDto } from './dto/create-rendezvous.dto';
import { UpdateRendezvousDto } from './dto/update-rendezvous.dto';
import { RendezvousService } from './rendez-vous.service';
import { UserRole } from '@/schemas/user.schema';
import { Roles } from '@/shared/decorators/roles.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';

@Controller('rendezvous')
export class RendezvousController {
    constructor(private readonly rendezvousService: RendezvousService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.USER) // Ou enlever complètement les gardes pour rester public
    create(@Body() createDto: CreateRendezvousDto, @Req() req: any) {
        return this.rendezvousService.create(createDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('search') search?: string
    ) {
     return this.rendezvousService.findAll(page, limit, status, date, search);
    }

    @Get('user')
    @UseGuards(AuthGuard)
    findByUser(
        @Query('email') email: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10
    ) {
        return this.rendezvousService.findByEmail(email, page, limit);
    }

    @Get('slots')
    getOccupiedSlots(@Query('date') date: string) {
        return this.rendezvousService.getOccupiedSlots(date);
    }

    @Get('available-slots')
    getAvailableSlots(@Query('date') date: string) {
        return this.rendezvousService.getAvailableSlots(date);
    }

    @Get('available-dates')
    async getAvailableDates() {
        return this.rendezvousService.getAvailableDates();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findOne(@Param('id') id: string) {
        if (id === 'stats') {
        throw new BadRequestException('Invalid rendezvous ID');
        }
        return this.rendezvousService.findOne(id);
    }

    @Put(':id')
    @UseGuards(AuthGuard)
    update(@Param('id') id: string, @Body() updateDto: UpdateRendezvousDto) {
        return this.rendezvousService.update(id, updateDto);
    }

    @Put(':id/status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: string,
        @Req() req: any, // Déplacez req avant les paramètres optionnels
        @Body('avisAdmin') avisAdmin?: string
    ) {
        return this.rendezvousService.updateStatus(id, status, avisAdmin, req.user);
    }

    @Delete(':id')
    @UseGuards(AuthGuard)
    remove(@Param('id') id: string, @Req() req: any) {
        return this.rendezvousService.removeWithPolicy(id, req.user?.role === 'admin');
    }


    @Get('stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async getStats(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
        return this.rendezvousService.getDashboardStats(startDate, endDate);
    }
    
    @Get('stats/dashboard')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async getDashboardStats() {
        return this.rendezvousService.getDashboardStats();
    }

    @Get('stats/detailed')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async getDetailedStats(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
     return this.rendezvousService.getStats(startDate, endDate);
    }

}
