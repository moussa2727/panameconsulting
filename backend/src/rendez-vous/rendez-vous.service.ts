import { 
    BadRequestException, 
    ConflictException, 
    Inject, 
    Injectable, 
    forwardRef,
    Logger,
    NotFoundException,
    ForbiddenException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { ProcedureService } from '../procedure/procedure.service';
import { NotificationService } from '../notification/notification.service';
import { Rendezvous } from '../schemas/rendezvous.schema';
import { CreateRendezvousDto } from './dto/create-rendezvous.dto';
import { UpdateRendezvousDto } from './dto/update-rendezvous.dto';
import { User, UserRole } from '@/schemas/user.schema';
import { UpdateUserDto } from '@/auth/dto/update-user.dto';

const HOLIDAYS_2025 = [
    '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-01',
    '2025-05-08', '2025-05-29', '2025-06-08', '2025-06-09',
    '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11', '2025-12-25'
];

@Injectable()
export class RendezvousService {
    [x: string]: any;
    private readonly logger = new Logger(RendezvousService.name);
    private readonly MAX_SLOTS_PER_DAY = 24;
    private readonly WORKING_HOURS = { start: 9, end: 16.5 };

    constructor(
        @InjectModel(Rendezvous.name) private rendezvousModel: Model<Rendezvous>,
        @Inject(forwardRef(() => ProcedureService))
        private procedureService: ProcedureService,
        private notificationService: NotificationService
    ) { }

    private isWeekend(dateStr: string): boolean {
        const date = new Date(dateStr);
        return date.getDay() === 0 || date.getDay() === 6;
    }

    private isHoliday(dateStr: string): boolean {
        return HOLIDAYS_2025.includes(dateStr);
    }

    private validateDateConstraints(dateStr: string): void {
        if (this.isWeekend(dateStr)) {
            throw new BadRequestException('Les réservations sont fermées le week-end');
        }
        
        if (this.isHoliday(dateStr)) {
            throw new BadRequestException('Les réservations sont fermées les jours fériés');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(dateStr);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            throw new BadRequestException('Vous ne pouvez pas réserver une date passée');
        }
    }

    private validateTimeSlot(time: string): void {
        const [hours, minutes] = time.split(':').map(Number);
        const timeInHours = hours + minutes / 60;
        
        if (timeInHours < this.WORKING_HOURS.start || timeInHours > this.WORKING_HOURS.end) {
            throw new BadRequestException('Les horaires disponibles sont entre 9h00 et 16h30');
        }

        const totalMinutes = (hours - 9) * 60 + minutes;
        if (totalMinutes % 30 !== 0) {
            throw new BadRequestException('Les créneaux doivent être espacés de 30 minutes (9h00, 9h30, 10h00, etc.)');
        }
    }

    async create(createDto: CreateRendezvousDto): Promise<Rendezvous> {
        this.logger.log(`Tentative de création de rendez-vous pour: ${createDto.email}`);
        
        // Vérifier s'il y a déjà un rendez-vous en cours pour cet email
        const pendingCount = await this.rendezvousModel.countDocuments({
            email: createDto.email,
            status: { $in: ['En attente', 'Confirmé'] }
        });
        
        if (pendingCount >= 1) {
            throw new BadRequestException('Vous avez déjà un rendez-vous en cours');
        }

        // Traitement des champs "Autre"
        const processedData = this.processOtherFields(createDto);

        // Valider les contraintes de date et heure
        this.validateDateConstraints(processedData.date);
        this.validateTimeSlot(processedData.time);

        // Vérifier la disponibilité du créneau
        const isAvailable = await this.isSlotAvailable(processedData.date, processedData.time);
        if (!isAvailable) {
            throw new BadRequestException('Ce créneau horaire n\'est pas disponible');
        }

        // Vérifier le nombre maximum de créneaux par jour
        const dayCount = await this.rendezvousModel.countDocuments({ 
            date: processedData.date,
            status: { $ne: 'Annulé' }
        });
        
        if (dayCount >= this.MAX_SLOTS_PER_DAY) {
            throw new BadRequestException('Tous les créneaux sont complets pour cette date');
        }

        // Créer le rendez-vous
        const created = new this.rendezvousModel({
            ...processedData,
            status: 'En attente'
        });
        
        const saved = await created.save();
        this.logger.log(`Rendez-vous créé avec succès: ${saved._id} pour ${saved.email}`);

        // Envoyer la notification de confirmation
        try {
            await this.notificationService.sendConfirmation(saved);
            this.logger.log(`Notification de confirmation envoyée à: ${saved.email}`);
        } catch (error) {
            this.logger.error(`Erreur lors de l'envoi de la notification: ${error.message}`);
            // Ne pas bloquer la création si l'envoi d'email échoue
        }
        
        return saved;
    }

    private processOtherFields(createDto: CreateRendezvousDto): any {
        const processed = { ...createDto };
        
        // CORRECTION : Traiter les valeurs "Autre" pour utiliser les valeurs personnalisées comme valeurs principales
        // Destination
        if (processed.destination === 'Autre' && processed.destinationAutre) {
            // Remplacer la destination par la valeur personnalisée
            processed.destination = processed.destinationAutre.trim();
            // Garder aussi la valeur dans destinationAutre pour référence historique
            processed.destinationAutre = processed.destinationAutre.trim();
        } else if (processed.destination !== 'Autre') {
            // Si pas "Autre", nettoyer destinationAutre pour éviter les données incohérentes
            processed.destinationAutre = undefined;
        }
    
        // Filière
        if (processed.filiere === 'Autre' && processed.filiereAutre) {
            // Remplacer la filière par la valeur personnalisée
            processed.filiere = processed.filiereAutre.trim();
            // Garder aussi la valeur dans filiereAutre pour référence historique
            processed.filiereAutre = processed.filiereAutre.trim();
        } else if (processed.filiere !== 'Autre') {
            // Si pas "Autre", nettoyer filiereAutre pour éviter les données incohérentes
            processed.filiereAutre = undefined;
        }
    
        // Validation finale : s'assurer que les champs requis sont présents
        if (!processed.destination || processed.destination.trim() === '') {
            throw new BadRequestException('La destination est obligatoire');
        }
    
        if (!processed.filiere || processed.filiere.trim() === '') {
            throw new BadRequestException('La filière est obligatoire');
        }
    
        // Valider que si "Autre" était sélectionné, une valeur personnalisée a bien été fournie
        const originalDestination = createDto.destination;
        const originalFiliere = createDto.filiere;
        
        if (originalDestination === 'Autre' && (!processed.destinationAutre || processed.destinationAutre.trim() === '')) {
            throw new BadRequestException('Veuillez préciser votre destination');
        }
    
        if (originalFiliere === 'Autre' && (!processed.filiereAutre || processed.filiereAutre.trim() === '')) {
            throw new BadRequestException('Veuillez préciser votre filière');
        }
    
        return processed;
    }

    async findAll(
        page: number = 1,
        limit: number = 10,
        status?: string,
        date?: string,
        search?: string
    ): Promise<{ data: Rendezvous[]; total: number; }> {
        const skip = (page - 1) * limit;
        
        const filters: any = {};
        if (status) filters.status = status;
        if (date) filters.date = date;
        if (search) {
            filters.$or = [
                { email: { $regex: search, $options: 'i' } },
                { destination: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }

        const data = await this.rendezvousModel.find(filters)
            .skip(skip)
            .limit(limit)
            .sort({ date: 1, time: 1 })
            .exec();
        
        const total = await this.rendezvousModel.countDocuments(filters);
        
        return { data, total };
    }

    async findByEmail(email: string, page: number = 1, limit: number = 10): Promise<{ data: Rendezvous[]; total: number; }> {
        const skip = (page - 1) * limit;
        const data = await this.rendezvousModel.find({ email })
            .skip(skip)
            .limit(limit)
            .sort({ date: -1, time: 1 })
            .exec();
        
        const total = await this.rendezvousModel.countDocuments({ email });
        
        return { data, total };
    }

    async findByEmailAndStatus(email: string, status: string, page: number = 1, limit: number = 10): Promise<{ data: Rendezvous[]; total: number; }> {
        const skip = (page - 1) * limit;
        const data = await this.rendezvousModel.find({ 
            email,
            status 
        })
        .skip(skip)
        .limit(limit)
        .sort({ date: -1, time: 1 })
        .exec();
        
        const total = await this.rendezvousModel.countDocuments({ email, status });
        
        return { data, total };
    }

    async findOne(id: string): Promise<Rendezvous | null> {
        return this.rendezvousModel.findById(id).exec();
    }

    async update(id: string, updateUserDto: UpdateUserDto, user: any): Promise<User> {
        console.log('🔄 Mise à jour utilisateur:', { id, updateUserDto });
        
        // Filtrer strictement les champs autorisés
        const allowedFields = ['email', 'telephone'];
        const filteredUpdate: any = {};
        
        Object.keys(updateUserDto).forEach(key => {
          if (allowedFields.includes(key) && updateUserDto[key as keyof UpdateUserDto] !== undefined) {
            filteredUpdate[key] = updateUserDto[key as keyof UpdateUserDto];
          }
        });
      
        // Vérifier qu'il y a des données à mettre à jour
        if (Object.keys(filteredUpdate).length === 0) {
          throw new BadRequestException('Aucune donnée valide à mettre à jour');
        }
      
        // Normaliser les données
        if (filteredUpdate.email) {
          filteredUpdate.email = filteredUpdate.email.toLowerCase().trim();
        }
      
        if (filteredUpdate.telephone) {
          filteredUpdate.telephone = this.normalizeTelephone(filteredUpdate.telephone);
        }
      
        console.log('✅ Données filtrées pour mise à jour:', filteredUpdate);
      
        try {
          const updatedUser = await this.userModel
            .findByIdAndUpdate(id, filteredUpdate, { 
              new: true, 
              runValidators: true 
            })
            .exec();
      
          if (!updatedUser) {
            throw new NotFoundException('Utilisateur non trouvé');
          }
      
          console.log('✅ Utilisateur mis à jour avec succès:', updatedUser.email);
          return updatedUser;
        } catch (error: any) {
          console.error('❌ Erreur mise à jour utilisateur:', error);
          
          if (error?.code === 11000) {
            const fields = Object.keys(error.keyPattern || {});
            if (fields.includes('email')) {
              throw new BadRequestException('Cet email est déjà utilisé');
            }
            if (fields.includes('telephone')) {
              throw new BadRequestException('Ce numéro de téléphone est déjà utilisé');
            }
            throw new BadRequestException('Conflit de données');
          }
          
          // Gérer les erreurs de validation Mongoose
          if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message);
            throw new BadRequestException(messages.join(', '));
          }
          
          throw error;
        }
      }

    async removeWithPolicy(id: string, user: any): Promise<Rendezvous | null> {
        const rdv = await this.rendezvousModel.findById(id).exec();
        if (!rdv) {
            throw new NotFoundException('Rendez-vous non trouvé');
        }

        const isAdmin = user.role === UserRole.ADMIN;

        // Vérifie que l'utilisateur est propriétaire ou admin
        if (!isAdmin && rdv.email !== user.email) {
            throw new ForbiddenException('Vous ne pouvez supprimer que vos propres rendez-vous');
        }

        // Restriction : les utilisateurs non-admins ne peuvent plus supprimer
        // si le rendez-vous est dans moins de 2 heures.
        if (!isAdmin) {
            const rdvDateTime = new Date(`${rdv.date}T${rdv.time}:00`);
            const now = new Date();
            const diffMs = rdvDateTime.getTime() - now.getTime();

            const twoHoursMs = 2 * 60 * 60 * 1000; // 2 heures

            // Si le rendez-vous est déjà passé ou dans moins de 2h → bloquer la suppression
            if (diffMs <= twoHoursMs) {
                throw new BadRequestException(
                    "Vous ne pouvez plus annuler votre rendez-vous à moins de 2 heures de l'heure prévue"
                );
            }
        }

        // Suppression autorisée
        const deleted = await this.rendezvousModel.findByIdAndDelete(id).exec();
        if (deleted) {
            this.logger.log(`Rendez-vous supprimé: ${id}`);
        }

        return deleted;
    }

    async updateStatus(id: string, status: string, avisAdmin?: string, user?: any): Promise<Rendezvous | null> {
        this.logger.log(`Tentative de mise à jour du statut: ${id} -> ${status} (avis: ${avisAdmin})`);
        
        if (!user || user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Accès refusé : vous devez être administrateur');
        }

        const allowedStatuses = ['En attente', 'Confirmé', 'Terminé', 'Annulé'];
        if (!allowedStatuses.includes(status)) {
            throw new BadRequestException('Statut invalide');
        }

        if (status === 'Terminé' && !avisAdmin) {
            throw new BadRequestException('L\'avis admin est obligatoire pour terminer un rendez-vous');
        }

        const update: any = { status };
        if (avisAdmin !== undefined) {
            update.avisAdmin = avisAdmin;
        }

        const updated = await this.rendezvousModel.findByIdAndUpdate(
            id, 
            update, 
            { new: true }
        );

        if (!updated) {
            throw new NotFoundException('Rendez-vous non trouvé');
        }

        this.logger.log(`Statut mis à jour avec succès: ${id}`);

        // Envoyer la notification de mise à jour du statut
        try {
            await this.notificationService.sendStatusUpdate(updated);
            this.logger.log(`Notification de statut envoyée à: ${updated.email}`);
        } catch (error) {
            this.logger.error(`Erreur lors de l'envoi de la notification de statut: ${error.message}`);
        }

        // Créer une procédure uniquement si le statut est "Terminé" et l'avis est "Favorable"
        if (avisAdmin === 'Favorable' && status === 'Terminé') {
            this.logger.log(`Tentative de création de procédure pour: ${updated.email}`);
            
            const existingProcedure = await this.procedureService.findByEmailAndStatus(
                updated.email,
                'En cours'
            );

            if (!existingProcedure) {
                try {
                    const newProcedure = await this.procedureService.createFromRendezvous(updated);
                    this.logger.log(`Procédure créée avec succès: ${newProcedure._id}`);
                    
                    // Envoyer la notification de création de procédure
                    await this.notificationService.sendProcedureCreation(newProcedure, updated);
                    this.logger.log(`Notification de procédure envoyée à: ${updated.email}`);
                } catch (error) {
                    this.logger.error(`Erreur lors de la création de la procédure: ${error.message}`);
                }
            } else {
                this.logger.log(`Procédure déjà existante pour: ${updated.email}`);
            }
        } else if (status === 'Terminé' && avisAdmin === 'Défavorable') {
            this.logger.log(`Avis défavorable - Aucune procédure créée pour: ${updated.email}`);
        }

        return updated;
    }

    async getAvailableDates(): Promise<string[]> {
        const availableDates: string[] = [];
        const today = new Date();
        
        for (let i = 0; i < 60; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            if (this.isWeekend(dateStr) || this.isHoliday(dateStr)) {
                continue;
            }

            const dayCount = await this.rendezvousModel.countDocuments({ 
                date: dateStr,
                status: { $ne: 'Annulé' }
            });
            
            if (dayCount < this.MAX_SLOTS_PER_DAY) {
                availableDates.push(dateStr);
            }
        }

        return availableDates;
    }

    async getOccupiedSlots(date: string): Promise<string[]> {
        const results = await this.rendezvousModel.find({ 
            date, 
            status: { $ne: 'Annulé' } 
        }).select('time -_id').lean().exec();
        
        return results.map((r) => r.time);
    }

    async getAvailableSlots(date: string): Promise<string[]> {
        if (this.isWeekend(date) || this.isHoliday(date)) {
            return [];
        }

        const occupiedSlots = await this.getOccupiedSlots(date);
        const allSlots = this.generateTimeSlots();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate.getTime() === today.getTime()) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();

            return allSlots.filter(slot => {
                const [hours, minutes] = slot.split(':').map(Number);
                const slotTime = hours * 60 + minutes;
                return slotTime > currentTime && !occupiedSlots.includes(slot);
            });
        }

        return allSlots.filter(slot => !occupiedSlots.includes(slot));
    }

    async isSlotAvailable(date: string, time: string, excludeId?: string): Promise<boolean> {
        const query: any = { 
            date, 
            time,
            status: { $ne: 'Annulé' } 
        };
        
        if (excludeId) {
            query._id = { $ne: excludeId };
        }
        
        const existing = await this.rendezvousModel.findOne(query);
        return !existing;
    }

    private generateTimeSlots(): string[] {
        const slots: string[] = [];
        for (let hour = 9; hour <= 16; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00`);
            if (hour < 16) {
                slots.push(`${hour.toString().padStart(2, '0')}:30`);
            }
        }
        return slots;
    }


    @Cron('0 9 * * *')
    async sendDailyReminders(): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const rendezvous = await this.rendezvousModel.find({ 
            date: today,
            status: 'Confirmé'
        });

        this.logger.log(`Envoi des rappels pour ${rendezvous.length} rendez-vous aujourd'hui`);

        for (const rdv of rendezvous) {
            try {
                await this.notificationService.sendReminder(rdv);
                this.logger.log(`Rappel envoyé pour le rendez-vous ${rdv._id}`);
            } catch (error) {
                this.logger.error(`Erreur d'envoi de rappel pour ${rdv._id}: ${error.message}`);
            }
        }
    }

    @Cron('0 * * * *')
    async updatePastRendezVous(): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const result = await this.rendezvousModel.updateMany(
            { 
                date: { $lt: today }, 
                status: { $in: ['En attente', 'Confirmé'] } 
            },
            { $set: { status: 'Terminé' } }
        );

        this.logger.log(`Mise à jour des rendez-vous passés: ${result.modifiedCount} mis à jour`);
    }

    @Cron('0 * * * *')
    async autoCancelPendingRendezvous(): Promise<void> {
        const fiveHoursAgo = new Date();
        fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);

        const result = await this.rendezvousModel.updateMany(
            { 
                status: 'En attente',
                createdAt: { $lt: fiveHoursAgo }
            },
            { $set: { status: 'Annulé' } }
        );

        this.logger.log(`Annulation automatique: ${result.modifiedCount} rendez-vous annulés`);
    }

   async confirmByUser(id: string, user: any): Promise<Rendezvous | null> {
  const rdv = await this.rendezvousModel.findById(id).exec();
  if (!rdv) {
    throw new NotFoundException('Rendez-vous non trouvé');
  }

  // Vérifier que l'utilisateur est propriétaire
  if (rdv.email !== user.email) {
    throw new ForbiddenException('Vous ne pouvez confirmer que vos propres rendez-vous');
  }

  // Vérifier que le statut actuel est "En attente"
  if (rdv.status !== 'En attente') {
    throw new BadRequestException('Seuls les rendez-vous en attente peuvent être confirmés');
  }

  // Vérifier que le rendez-vous n'est pas passé
  const now = new Date();
  const rdvDateTime = new Date(`${rdv.date}T${rdv.time}`);
  if (rdvDateTime < now) {
    throw new BadRequestException('Impossible de confirmer un rendez-vous passé');
  }

  // Mettre à jour le statut
  const updated = await this.rendezvousModel.findByIdAndUpdate(
    id, 
    { status: 'Confirmé' }, 
    { new: true }
  );

  if (!updated) {
    this.logger.warn(`Tentative de confirmation d'un rendez-vous non trouvé: ${id}`);
    throw new Error('Rendez-vous non trouvé');
  }

  this.logger.log(`Rendez-vous confirmé par l'utilisateur: ${id}`);

  // Envoyer notification
  try {
    await this.notificationService.sendStatusUpdate(updated);
    this.logger.log(`Notification de confirmation envoyée à: ${updated.email}`);
  } catch (error) {
    this.logger.error(`Erreur lors de l'envoi de la notification de confirmation: ${error.message}`);
    
  }

  return updated;
}
}