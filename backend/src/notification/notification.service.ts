import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Rendezvous } from '../schemas/rendezvous.schema';
import { Procedure, StepStatus } from '../schemas/procedure.schema';
import { ConfigService } from '@nestjs/config';
import { Contact } from '../schemas/contact.schema';
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST'),
      port: this.configService.get('EMAIL_PORT'),
      secure: this.configService.get('EMAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
      },
      tls: {
        rejectUnauthorized: this.configService.get('NODE_ENV') === 'production',
      },
    });
  }

  private getEmailTemplate(header: string, content: string, firstName: string) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0ea5e9, #0369a1); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; }
          .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .info-box { background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #0ea5e9; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${header}</h1>
        </div>
        <div class="content">
          <p>Bonjour <strong>${firstName}</strong>,</p>
          ${content}
          <div class="footer">
            <p>Cordialement,<br><strong>L'équipe Paname Consulting</strong></p>
            <p> ${this.configService.get('EMAIL_USER')}<br> www.panameconsulting.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendConfirmation(rendezvous: Rendezvous): Promise<void> {
    try {
      const content = `
        <p>Votre rendez-vous a été confirmé avec succès.</p>
        <div class="info-box">
          <h3> Détails de votre rendez-vous :</h3>
          <p><strong>Date :</strong> ${new Date(rendezvous.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p><strong>Heure :</strong> ${rendezvous.time}</p>
          <p><strong>Lieu :</strong> Consultation en ligne</p>
        </div>
        <p>Nous vous attendons avec impatience pour échanger sur votre projet d'études.</p>
        <p><em>Vous recevrez un rappel la veille de votre rendez-vous.</em></p>
      `;

      await this.transporter.sendMail({
        from: `"Paname Consulting" <${this.configService.get('EMAIL_USER')}>`,
        to: rendezvous.email,
        subject: ' Confirmation de votre rendez-vous - Paname Consulting',
        html: this.getEmailTemplate('Rendez-vous Confirmé', content, rendezvous.firstName)
      });
      this.logger.log(`Email de confirmation envoyé à: ${rendezvous.email}`);
    } catch (error) {
      this.logger.error(`Erreur envoi confirmation: ${error.message}`);
    }
  }

  async sendReminder(rendezvous: Rendezvous): Promise<void> {
    try {
      const content = `
        <p>Rappel : Vous avez un rendez-vous aujourd'hui !</p>
        <div class="info-box">
          <h3> Votre rendez-vous :</h3>
          <p><strong>Heure :</strong> ${rendezvous.time}</p>
          <p><strong>Lieu :</strong> Consultation en ligne</p>
        </div>
        <p>Préparez vos questions, nous sommes impatients de vous accompagner dans votre projet.</p>
        <p><strong>À très vite !</strong></p>
      `;

      await this.transporter.sendMail({
        from: `"Paname Consulting" <${this.configService.get('EMAIL_USER')}>`,
        to: rendezvous.email,
        subject: ' Rappel - Votre rendez-vous aujourd\'hui - Paname Consulting',
        html: this.getEmailTemplate('Rappel de Rendez-vous', content, rendezvous.firstName)
      });
    } catch (error) {
      this.logger.error(`Erreur envoi rappel: ${error.message}`);
    }
  }

  async sendStatusUpdate(rendezvous: Rendezvous, previousStatus?: string): Promise<void> {
    try {
      let content = '';
      let subject = '';

      if (rendezvous.status === 'Confirmé') {
        subject = ' Rendez-vous Confirmé - Paname Consulting';
        content = `
          <p>Votre rendez-vous a été confirmé par notre équipe.</p>
          <div class="info-box">
            <h3> Détails de votre rendez-vous :</h3>
            <p><strong>Date :</strong> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</p>
            <p><strong>Heure :</strong> ${rendezvous.time}</p>
            <p><strong>Statut :</strong> Confirmé </p>
          </div>
          <p>Nous vous attendons avec impatience !</p>
        `;
      } else if (rendezvous.status === 'Annulé') {
        subject = ' Rendez-vous Annulé - Paname Consulting';
        content = `
          <p>Votre rendez-vous a été annulé.</p>
          <div class="info-box">
            <h3> Détails de votre rendez-vous :</h3>
            <p><strong>Date prévue :</strong> ${new Date(rendezvous.date).toLocaleDateString('fr-FR')}</p>
            <p><strong>Heure prévue :</strong> ${rendezvous.time}</p>
            ${rendezvous.avisAdmin ? `<p><strong>Raison :</strong> ${rendezvous.avisAdmin}</p>` : ''}
          </div>
          <p>Si vous souhaitez reprogrammer un rendez-vous, n'hésitez pas à nous contacter.</p>
        `;
      } else if (rendezvous.status === 'Terminé') {
        if (rendezvous.avisAdmin === 'Favorable') {
          subject = ' Rendez-vous Terminé - Procédure Lancée - Paname Consulting';
          content = `
            <p>Votre rendez-vous s'est excellentement déroulé !</p>
            <div class="info-box">
              <h3> Avis favorable</h3>
              <p>Nous sommes ravis de vous annoncer que votre dossier a reçu un avis favorable.</p>
              <p><strong>Prochaine étape :</strong> Votre procédure d'admission a été officiellement lancée.</p>
            </div>
            <p>Vous recevrez sous peu un email détaillant les étapes de votre procédure.</p>
            <p><strong>Félicitations pour cette première étape réussie !</strong></p>
          `;
        } else if (rendezvous.avisAdmin === 'Défavorable') {
          subject = ' Rendez-vous Terminé - Avis Défavorable - Paname Consulting';
          content = `
            <p>Votre rendez-vous est maintenant terminé.</p>
            <div class="info-box">
              <h3> Avis défavorable</h3>
              <p>Malheureusement, votre dossier n'a pas reçu un avis favorable à l'issue de l'entretien.</p>
              <p>Notre équipe reste à votre disposition pour discuter des alternatives possibles.</p>
            </div>
            <p>N'hésitez pas à nous contacter pour plus d'informations.</p>
          `;
        }
      } else if (rendezvous.status === 'En attente') {
        subject = ' Statut Modifié - En Attente - Paname Consulting';
        content = `
          <p>Le statut de votre rendez-vous a été modifié.</p>
          <div class="info-box">
              <h3>Nouveau statut : En attente</h3>
            <p>Votre rendez-vous est en attente de confirmation.</p>
            <p>Nous vous tiendrons informé dès qu'il sera confirmé.</p>
          </div>
        `;
      }

      await this.transporter.sendMail({
        from: `"Paname Consulting" <${this.configService.get('EMAIL_USER')}>`,
        to: rendezvous.email,
        subject: subject,
        html: this.getEmailTemplate('Mise à jour de Rendez-vous', content, rendezvous.firstName)
      });
      this.logger.log(`Email de statut envoyé à: ${rendezvous.email} - Statut: ${rendezvous.status}`);
    } catch (error) {
      this.logger.error(`Erreur envoi mise à jour: ${error.message}`);
    }
  }

  async sendProcedureUpdate(procedure: Procedure): Promise<void> {
    try {
      const currentStep = procedure.steps.find(s => s.statut === StepStatus.IN_PROGRESS);
      const completedSteps = procedure.steps.filter(s => s.statut === StepStatus.COMPLETED).length;
      const totalSteps = procedure.steps.length;
      const progress = Math.round((completedSteps / totalSteps) * 100);

      let content = '';
      if (currentStep) {
        content = `
          <p>Votre procédure d'admission avance !</p>
          <div class="info-box">
            <h3> Progression : ${progress}%</h3>
            <p><strong>Étape en cours :</strong> ${currentStep.nom}</p>
            <p><strong>Statut global :</strong> ${procedure.statut}</p>
            ${currentStep.raisonRefus ? `<p><strong>Commentaire :</strong> ${currentStep.raisonRefus}</p>` : ''}
          </div>
          <p>Nous travaillons activement sur votre dossier.</p>
        `;
      } else {
        content = `
          <p> Félicitations ! Votre procédure d'admission est terminée.</p>
          <div class="info-box">
            <h3> Procédure finalisée</h3>
            <p><strong>Statut :</strong> ${procedure.statut}</p>
            <p>Toutes les étapes ont été complétées avec succès.</p>
          </div>
          <p>Notre équipe vous contactera très prochainement pour la suite.</p>
        `;
      }

      await this.transporter.sendMail({
        from: `"Paname Consulting" <${this.configService.get('EMAIL_USER')}>`,
        to: procedure.email,
        subject: currentStep ? ' Mise à jour de votre procédure - Paname Consulting' : ' Procédure Terminée - Paname Consulting',
        html: this.getEmailTemplate('Mise à jour de Procédure', content, procedure.prenom)
      });
    } catch (error) {
      this.logger.error(`Erreur envoi mise à jour procédure: ${error.message}`);
    }
  }

  async sendProcedureCreation(procedure: Procedure, rendezvous: Rendezvous): Promise<void> {
    try {
      const content = `
        <p>Félicitations ! Suite à votre rendez-vous favorable, votre procédure d'admission a été entamée.</p>
        
        <div class="info-box">
          <h3> Votre procédure est entamée</h3>
          <p><strong>Destination :</strong> ${procedure.destination}</p>
        </div>

        <p>Vous pouvez suivre l'avancement de votre procédure dans votre espace personnel.</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <a href="#" class="button">Accéder à mon espace</a>
        </div>

        <p><strong>Notre équipe vous accompagne à chaque étape !</strong></p>
      `;

      await this.transporter.sendMail({
        from: `"Paname Consulting" <${this.configService.get('EMAIL_USER')}>`,
        to: procedure.email,
        subject: ' Votre procédure est lancée ! - Paname Consulting',
        html: this.getEmailTemplate('Procédure Créée', content, procedure.prenom)
      });
      this.logger.log(`Email de création de procédure envoyé à: ${procedure.email}`);
    } catch (error) {
      this.logger.error(`Erreur envoi création procédure: ${error.message}`);
    }
  }


  async sendContactReply(contact: Contact, reply: string): Promise<void> {
    try {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Paname Consulting</h1>
          </div>
          <div style="padding: 30px; background: white; border: 1px solid #e0e0e0;">
            <h2 style="color: #333; margin-top: 0;">Bonjour ${contact.firstName || ''},</h2>
            <p style="color: #666; line-height: 1.6;">${reply}</p>
            <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                <strong>Rappel de votre demande :</strong><br/>
                ${contact.message}
              </p>
            </div>
          </div>
          <div style="padding: 20px; background: #f8f9fa; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Paname Consulting. Tous droits réservés.
            </p>
          </div>
        </div>
      `;
  
      await this.transporter.sendMail({
        from: `"Paname Consulting" <${this.configService.get('EMAIL_USER')}>`,
        to: contact.email,
        subject: 'Réponse à votre message - Paname Consulting',
        html: emailContent
      });
      this.logger.log(`Email de réponse envoyé à: ${contact.email}`);
    } catch (error) {
      this.logger.error(`Erreur envoi réponse contact: ${error.message}`);
      throw new Error('Erreur lors de l\'envoi de la réponse');
    }
  }
  
  async sendContactNotification(contact: Contact): Promise<void> {
    try {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Nouveau Message - Paname Consulting</h1>
          </div>
          <div style="padding: 30px; background: white; border: 1px solid #e0e0e0;">
            <h3 style="color: #333; margin-top: 0;">Nouveau message de contact reçu :</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>De :</strong> ${contact.firstName} ${contact.lastName}</p>
              <p><strong>Email :</strong> ${contact.email}</p>
              <p><strong>Message :</strong><br/>${contact.message}</p>
            </div>
          </div>
        </div>
      `;
  
      await this.transporter.sendMail({
        from: `"Paname Consulting" <${this.configService.get('EMAIL_USER')}>`,
        to: this.configService.get('ADMIN_EMAIL'),
        subject: 'Nouveau message de contact - Paname Consulting',
        html: emailContent
      });
      this.logger.log(`Email de notification envoyé à l'admin pour: ${contact.email}`);
    } catch (error) {
      this.logger.error(`Erreur envoi notification contact: ${error.message}`);
      throw new Error('Erreur lors de l\'envoi de la notification');
    }
  }
  
  async sendContactConfirmation(contact: Contact): Promise<void> {
    try {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Paname Consulting</h1>
          </div>
          <div style="padding: 30px; background: white; border: 1px solid #e0e0e0;">
            <h2 style="color: #333; margin-top: 0;">Confirmation de réception</h2>
            <p style="color: #666; line-height: 1.6;">
              Bonjour ${contact.firstName },<br><br>
              Nous accusons réception de votre message et vous remercions de l'intérêt que vous portez à Paname Consulting.
            </p>
            <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                <strong>Résumé de votre message :</strong><br/>
                ${contact.message}
              </p>
            </div>
            <p style="color: #666; line-height: 1.6; margin-top: 20px;">
              Notre équipe vous contactera dans les plus brefs délais.
            </p>
          </div>
          <div style="padding: 20px; background: #f8f9fa; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Paname Consulting. Tous droits réservés.
            </p>
          </div>
        </div>
      `;
  
      await this.transporter.sendMail({
        from: `"Paname Consulting" <${this.configService.get('EMAIL_USER')}>`,
        to: contact.email,
        subject: 'Confirmation de votre message - Paname Consulting',
        html: emailContent
      });
      this.logger.log(`Email de confirmation envoyé à: ${contact.email}`);
    } catch (error) {
      this.logger.error(`Erreur envoi confirmation contact: ${error.message}`);
      throw new Error('Erreur lors de l\'envoi de la confirmation');
    }
  }


  async sendCancellationNotification(procedure: Procedure): Promise<void> {
    try {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Paname Consulting</h1>
          </div>
        </div>
      `;
      await this.transporter.sendMail({
        from: `"Paname Consulting" <${this.configService.get('EMAIL_USER')}>`,
        to: procedure.email,
        subject: 'Annulation de votre procédure - Paname Consulting',
        html: emailContent
      });
      this.logger.log(`Email de notification d'annulation envoyé à: ${procedure.email}`);
    } catch (error) {
      this.logger.error(`Erreur envoi notification d'annulation: ${error.message}`);
      throw new Error('Erreur lors de l\'envoi de la notification d\'annulation');
    }
  }

  async sendCancellationConfirmation(procedure: Procedure): Promise<void> {
    try {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Paname Consulting</h1>
          </div>
          <div style="padding: 30px; background: white; border: 1px solid #e0e0e0;">
            <h3 style="color: #333; margin-top: 0;">Confirmation d'annulation :</h3>
            <p style="color: #666; line-height: 1.6;">
              ${procedure.prenom} ${procedure.nom} a annulé sa procédure.
            </p>
          </div>
          <div style="padding: 20px; background: #f8f9fa; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Paname Consulting. Tous droits réservés.
            </p>
          </div>
        </div>
      `;
      await this.transporter.sendMail({
        from: `"Paname Consulting" <${this.configService.get('EMAIL_USER')}>`,
        to: procedure.email,
        subject: `Confirmation d\'annulation de votre procédure - ${procedure.prenom} ${procedure.nom}`,
        html: emailContent
      });
      this.logger.log(`Email de confirmation d'annulation envoyé à: ${procedure.email}`);
    } catch (error) {
      this.logger.error(`Erreur envoi confirmation d'annulation: ${error.message}`);
      throw new Error('Erreur lors de l\'envoi de la confirmation d\'annulation');
    }
  }

  async sendCancellationNotificationToAdmin(procedure: Procedure): Promise<void> {
    try {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Paname Consulting</h1>
          </div>
          <div style="padding: 30px; background: white; border: 1px solid #e0e0e0;">
            <h3 style="color: #333; margin-top: 0;">Annulation de procédure :</h3>
            <p style="color: #666; line-height: 1.6;">
              ${procedure.prenom} ${procedure.nom} a annulé sa procédure.
            </p>
            <p style="color: #666; line-height: 1.6;">
              <strong>Raison :</strong> ${procedure.deletionReason}
            </p>
            <p style="color: #666; line-height: 1.6;">
              <strong>Date d'annulation :</strong> ${procedure.deletedAt ? new Date(procedure.deletedAt).toLocaleDateString('fr-FR') : ''}
            </p>
            <p style="color: #666; line-height: 1.6;">
              <strong>Email :</strong> ${procedure.email}
            </p>
            <p style="color: #666; line-height: 1.6;">
              <strong>Destination :</strong> ${procedure.destination}
          </div>
          <div style="padding: 20px; background: #f8f9fa; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Paname Consulting. Tous droits réservés.
            </p>
          </div>
        </div>
      `;
      await this.transporter.sendMail({
        from: `${procedure.email}`,
        to: this.configService.get('EMAIL_USER'),
        subject: `Annulation de procédure - ${procedure.prenom} ${procedure.nom}`,
        html: emailContent
      });
      this.logger.log(`Email de notification d'annulation envoyé à l'admin pour: ${procedure.email}`);
    } catch (error) {
      this.logger.error(`Erreur envoi notification d'annulation à l'admin: ${error.message}`);
      throw new Error('Erreur lors de l\'envoi de la notification d\'annulation à l\'admin');
    }
  }
  

}
