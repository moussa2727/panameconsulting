import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards
} from '@nestjs/common';
import { UserRole } from '../schemas/user.schema';
import { Roles } from '../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('')
export class ContactController {
  constructor(private readonly contactService: ContactService) { }

  @Post('contact')
  async create(@Body() createContactDto: CreateContactDto) {
    try {
      const contact = await this.contactService.create(createContactDto);
      return {
        message: 'Message envoyé avec succès',
        contact
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Échec de l\'envoi du message',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Endpoints admin - protégés par authentification et rôle admin
  @Get('admin/contact')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllMessages() {
    try {
      const messages = await this.contactService.findAll();
      return messages;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Erreur lors de la récupération des messages',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admin/contact/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getMessage(@Param('id') id: string) {
    try {
      const message = await this.contactService.findOne(id);
      return message;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Message non trouvé',
          message: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Patch('admin/contact/:id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async markAsRead(@Param('id') id: string) {
    try {
      const message = await this.contactService.markAsRead(id);
      return {
        message: 'Message marqué comme lu',
        contact: message
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Erreur lors du marquage',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('admin/contact/:id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async replyToMessage(
    @Param('id') id: string,
    @Body() body: { reply: string },
    @Request() req: any
  ) {
    try {
      const adminEmail = req.user.email;
      const message = await this.contactService.replyToMessage(id, body.reply, adminEmail);
      return {
        message: 'Réponse envoyée avec succès',
        contact: message
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Erreur lors de l\'envoi de la réponse',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('admin/contact/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteMessage(@Param('id') id: string) {
    try {
      await this.contactService.remove(id);
      return {
        message: 'Message supprimé avec succès'
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Erreur lors de la suppression',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('admin/contact/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getContactStats() {
    try {
      const stats = await this.contactService.getStats();
      return stats;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Erreur lors de la récupération des statistiques',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}