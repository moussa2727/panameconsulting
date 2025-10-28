import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { Contact } from "../shared/interfaces/contact.interface";
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectModel('Contact') private contactModel: Model<Contact>,
  ) {
    // Configuration du transporteur SMTP
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true', // true pour le port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async create(createContactDto: CreateContactDto): Promise<Contact> {
    try {
      const createdContact = new this.contactModel(createContactDto);
      const savedContact = await createdContact.save();

      this.logger.log(`Nouveau message de contact reçu de ${savedContact.email}`);

      // Envoyer la notification à l'admin
      await this.sendAdminNotification(savedContact);
      
      // Envoyer la confirmation à l'utilisateur
      await this.sendUserConfirmation(savedContact);

      return savedContact.toObject();
    } catch (error) {
      this.logger.error(`Erreur lors de la création du contact: ${error.message}`);
      throw error;
    }
  }

  private async sendAdminNotification(contact: Contact) {
    try {
      const mailOptions = {
        from: `${contact.email}>`,
        to: process.env.EMAIL_USER,
        subject: 'Nouveau message de contact',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d6efd;">Nouveau message de contact</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <p><strong>De :</strong> ${contact.firstName} ${contact.lastName}</p>
              <p><strong>Email :</strong> ${contact.email}</p>
              <p><strong>Date :</strong> ${new Date().toLocaleString()}</p>
              <div style="margin-top: 20px; padding: 15px; background-color: #e7f1ff; border-radius: 5px;">
                <p style="margin: 0;"><strong>Message :</strong></p>
                <p style="margin-top: 10px; white-space: pre-wrap;">${contact.message}</p>
              </div>
            </div>
            <div style="margin-top: 30px; text-align: center; font-size: 0.9em; color: #6c757d;">
              <p>Ce message a été envoyé depuis le formulaire de contact de votre site web</p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Notification admin envoyée à ${process.env.EMAIL_USER}`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de la notification admin: ${error.message}`);
    }
  }

  private async sendUserConfirmation(contact: Contact) {
    try {
      const mailOptions = {
        from: `"Paname Consulting" <${process.env.EMAIL_USER}>`,
        to: contact.email,
        subject: 'Confirmation de réception',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d6efd; text-align: center;">Merci pour votre message !</h2>
            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin-top: 20px;">
              <p style="font-size: 1.1em;">Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.</p>
              
              <div style="margin-top: 30px; padding: 20px; background-color: #e7f1ff; border-radius: 8px;">
                <p style="margin: 0; font-weight: 500;">Récapitulatif de votre message :</p>
                <p style="margin-top: 15px; padding: 15px; background: white; border-left: 4px solid #0d6efd; font-style: italic;">
                  ${contact.message}
                </p>
              </div>
            </div>
            
            <div style="margin-top: 40px; text-align: center; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 0.9em; color: #6c757d;">
                <strong>Équipe de support : Paname Consulting</strong><br>
                <em>Ceci est un message automatique - merci de ne pas y répondre</em>
              </p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Confirmation envoyée à ${contact.email}`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de la confirmation: ${error.message}`);
    }
  }

  async findAll(): Promise<Contact[]> {
    try {
      const contacts = await this.contactModel.find().sort({ createdAt: -1 }).exec();
      return contacts.map(contact => contact.toObject());
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des contacts: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string): Promise<Contact> {
    try {
      const contact = await this.contactModel.findById(id).exec();
      if (!contact) {
        throw new NotFoundException('Message de contact non trouvé');
      }
      return contact.toObject();
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du contact ${id}: ${error.message}`);
      throw error;
    }
  }

  async markAsRead(id: string): Promise<Contact> {
    try {
      const contact = await this.contactModel.findByIdAndUpdate(
        id,
        { isRead: true },
        { new: true }
      ).exec();

      if (!contact) {
        throw new NotFoundException('Message de contact non trouvé');
      }

      this.logger.log(`Message ${id} marqué comme lu`);
      return contact.toObject();
    } catch (error) {
      this.logger.error(`Erreur lors du marquage comme lu du contact ${id}: ${error.message}`);
      throw error;
    }
  }

  async replyToMessage(id: string, reply: string, adminEmail: string): Promise<Contact> {
    try {
      const contact = await this.contactModel.findById(id).exec();
      if (!contact) {
        throw new NotFoundException('Message de contact non trouvé');
      }

      this.logger.log(`Réponse de l'admin ${adminEmail} au contact ${contact.email} - Réponse: ${reply}`);

      // Mettre à jour le message avec la réponse et marquer comme lu automatiquement
      const updatedContact = await this.contactModel.findByIdAndUpdate(
        id,
        {
          adminResponse: reply,
          respondedAt: new Date(),
          isRead: true // Marquer automatiquement comme lu
        },
        { new: true }
      ).exec();

      if (!updatedContact) {
        throw new NotFoundException('Erreur lors de la mise à jour du message');
      }

      return updatedContact.toObject();
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de la réponse au contact ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const result = await this.contactModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException('Message de contact non trouvé');
      }

      this.logger.log(`Message de contact ${id} supprimé`);
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression du contact ${id}: ${error.message}`);
      throw error;
    }
  }

  async getStats(): Promise<{
    total: number;
    unread: number;
    read: number;
    responded: number;
    thisMonth: number;
    lastMonth: number;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const [total, unread, read, responded, thisMonth, lastMonth] = await Promise.all([
        this.contactModel.countDocuments(),
        this.contactModel.countDocuments({ isRead: false }),
        this.contactModel.countDocuments({ isRead: true }),
        this.contactModel.countDocuments({ adminResponse: { $exists: true, $ne: null } }),
        this.contactModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
        this.contactModel.countDocuments({
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        })
      ]);

      return {
        total,
        unread,
        read,
        responded,
        thisMonth,
        lastMonth
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des statistiques: ${error.message}`);
      throw error;
    }
  }  
}
