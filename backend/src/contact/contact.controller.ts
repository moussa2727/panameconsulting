import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
    Req
} from '@nestjs/common';
import { UserRole } from '../schemas/user.schema';
import { Roles } from '../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('contact')
export class ContactController {
    constructor(private readonly contactService: ContactService) { }

    // 📧 Envoyer un message (public)
    @Post()
    async create(@Body() createContactDto: CreateContactDto) {
        const contact = await this.contactService.create(createContactDto);
        return {
            message: 'Message envoyé avec succès',
            contact
        };
    }

    // 📋 Récupérer tous les messages (admin seulement)
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('isRead') isRead?: boolean,
        @Query('search') search?: string
    ) {
        return this.contactService.findAll(page, limit, isRead, search);
    }

    // 📊 Statistiques (admin seulement)
    @Get('stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async getStats() {
        return this.contactService.getStats();
    }

    // 👁️ Voir un message spécifique (admin seulement)
    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async findOne(@Param('id') id: string) {
        return this.contactService.findOne(id);
    }

    // ✅ Marquer comme lu (admin seulement)
    @Patch(':id/read')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async markAsRead(@Param('id') id: string) {
        const message = await this.contactService.markAsRead(id);
        return {
            message: 'Message marqué comme lu',
            contact: message
        };
    }

    // 📩 Répondre à un message (admin seulement)
    @Post(':id/reply')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async replyToMessage(
        @Param('id') id: string,
        @Body() body: { reply: string },
        @Req() req: any
    ) {
        const message = await this.contactService.replyToMessage(
            id, 
            body.reply, 
            req.user
        );
        return {
            message: 'Réponse envoyée avec succès',
            contact: message
        };
    }

    // 🗑️ Supprimer un message (admin seulement)
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async deleteMessage(@Param('id') id: string) {
        await this.contactService.remove(id);
        return {
            message: 'Message supprimé avec succès'
        };
    }
}