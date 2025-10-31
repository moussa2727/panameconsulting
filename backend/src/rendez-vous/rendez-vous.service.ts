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
import { UserRole } from '@/schemas/user.schema';

  
const HOLIDAYS_2025 = [
    '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-01',
    '2025-05-08', '2025-05-29', '2025-06-08', '2025-06-09',
    '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11', '2025-12-25'
];
  
  @Injectable()
  export class RendezvousService {
      private readonly logger = new Logger(RendezvousService.name);
    private readonly MAX_SLOTS_PER_DAY = 24;
    private readonly WORKING_HOURS = { start: 9, end: 16.5 }; // 9h00 à 16h30

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

    // Dans rendez-vous.service.ts
async findByEmailAndStatus(email: string, status: string): Promise<{ data: Rendezvous[]; total: number; }> {
    const data = await this.rendezvousModel.find({ 
        email,
        status 
    })
    .sort({ date: -1, time: 1 })
    .exec();
    
    const total = await this.rendezvousModel.countDocuments({ email, status });
    
    return { data, total };
}

  
    private validateTimeSlot(time: string): void {
        const [hours, minutes] = time.split(':').map(Number);
        const timeInHours = hours + minutes / 60;
        
        if (timeInHours < this.WORKING_HOURS.start || timeInHours > this.WORKING_HOURS.end) {
            throw new BadRequestException('Les horaires disponibles sont entre 9h00 et 16h30');
        }

        // Vérifier que l'horaire est un multiple de 30 minutes depuis 9h00
        const totalMinutes = (hours - 9) * 60 + minutes;
        if (totalMinutes % 30 !== 0) {
            throw new BadRequestException('Les créneaux doivent être espacés de 30 minutes (9h00, 9h30, 10h00, etc.)');
        }
    }
  
    async create(createDto: CreateRendezvousDto): Promise<Rendezvous> {
        // Vérification nombre max de rendez-vous
        const pendingCount = await this.rendezvousModel.countDocuments({
            email: createDto.email,
            status: { $in: ['En attente', 'Confirmé'] }
        });
        
        if (pendingCount >= 1) {
            throw new BadRequestException('Vous avez déjà un rendez-vous en cours');
        }

        // Validation date/weekend/jours fériés
        this.validateDateConstraints(createDto.date);
        this.validateTimeSlot(createDto.time);

        // Vérification créneau disponible
        const isAvailable = await this.isSlotAvailable(createDto.date, createDto.time);
        if (!isAvailable) {
            throw new BadRequestException('Ce créneau horaire n\'est pas disponible');
        }

        // Vérifier le nombre maximal de rendez-vous pour cette date
        const dayCount = await this.rendezvousModel.countDocuments({ 
            date: createDto.date,
            status: { $ne: 'Annulé' }
        });
        
        if (dayCount >= this.MAX_SLOTS_PER_DAY) {
            throw new BadRequestException('Tous les créneaux sont complets pour cette date');
        }

        const created = new this.rendezvousModel({
            ...createDto,
            status: 'En attente'
        });
        
        const saved = await created.save();
        
        // Notification
        await this.notificationService.sendConfirmation(saved);
        
        return saved;
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
  if (search) filters.$or = [
    { email: { $regex: search, $options: 'i' } },
    { destination: { $regex: search, $options: 'i' } }
  ];

  const data = await this.rendezvousModel.find(filters)
    .skip(skip)
    .limit(limit)
    .sort({ date: 1, time: 1 })  // ⚠️ tu utilisais parfois `horaire`, parfois `time`
    .exec();
  
  const total = await this.rendezvousModel.countDocuments(filters);
  
  return { data, total };
}


    async getAvailableDates(): Promise<string[]> {
    const availableDates: string[] = [];
    const today = new Date();
    
    // Générer les 60 prochains jours
    for (let i = 0; i < 60; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        // Vérifier si la date est valide (pas un weekend ou jour férié)
        if (this.isWeekend(dateStr) || this.isHoliday(dateStr)) {
            continue;
        }

        // Vérifier le nombre de rendez-vous pour cette date
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
  
    async findByEmail(email: string, page: number = 1, limit: number = 10): Promise<{ data: Rendezvous[]; total: number; }> {
      const skip = (page - 1) * limit;
      const data = await this.rendezvousModel.find({ email })
        .skip(skip)
        .limit(limit)
        .sort({ date: -1, horaire: 1 })
        .exec();
      
      const total = await this.rendezvousModel.countDocuments({ email });
      
      return { data, total };
    }
  
    async findOne(id: string): Promise<Rendezvous | null> {
      return this.rendezvousModel.findById(id).exec();
    }
  
    async update(id: string, updateDto: UpdateRendezvousDto): Promise<Rendezvous | null> {
      const existing = await this.rendezvousModel.findById(id);
      if (!existing) {
        throw new NotFoundException('Rendez-vous non trouvé');
      }
  
      if (updateDto.date) {
        this.validateDateConstraints(updateDto.date);
      }
  
      if (updateDto.horaire) {
        this.validateTimeSlot(updateDto.horaire);
        
        // Vérifier si le nouveau créneau est disponible
        const isAvailable = await this.isSlotAvailable(
          updateDto.date || existing.date, 
          updateDto.horaire,
          id
        );
        
        if (!isAvailable) {
          throw new BadRequestException('Ce créneau horaire n\'est pas disponible');
        }
      }
      
      try {
        const updated = await this.rendezvousModel.findByIdAndUpdate(
          id, 
          { ...updateDto, $inc: { __v: 1 } },
          { new: true, runValidators: true }
        ).exec();
  
        if (updated) {
          await this.notificationService.sendConfirmation(updated);
        }
  
        return updated;
      } catch (error) {
        if (error.name === 'VersionError') {
          throw new ConflictException('Le document a été modifié par un autre utilisateur');
        }
        throw error;
      }
    }
  
    async remove(id: string): Promise<Rendezvous | null> {
      const deleted = await this.rendezvousModel.findByIdAndDelete(id).exec();
      if (deleted) {
        this.logger.log(`Rendez-vous supprimé: ${id}`);
      }
      return deleted;
    }

    async removeWithPolicy(id: string, isAdmin: boolean): Promise<Rendezvous | null> {
      const rdv = await this.rendezvousModel.findById(id).exec();
      if (!rdv) {
        throw new NotFoundException('Rendez-vous non trouvé');
      }
      if (!isAdmin) {
        const rdvDate = new Date(`${rdv.date}T${rdv.time}:00`);
        const now = new Date();
        const diffMs = rdvDate.getTime() - now.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (diffMs < oneDayMs) {
          throw new BadRequestException('Vous ne pouvez annuler qu’au moins 24h avant');
        }
      }
      const deleted = await this.rendezvousModel.findByIdAndDelete(id).exec();
      if (deleted) {
        this.logger.log(`Rendez-vous supprimé: ${id}`);
      }
      return deleted;
    }
  
   
    async updateStatus(id: string, status: string, avisAdmin?: string, user?: any): Promise<Rendezvous | null> {
    // Vérifier que l'utilisateur est admin
    if (!user || user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Accès refusé : vous devez être administrateur');
    }

    const allowedStatuses = ['En attente', 'Confirmé', 'Terminé', 'Annulé'];
    if (!allowedStatuses.includes(status)) {
        throw new BadRequestException('Statut invalide');
    }

    // Vérifier que l'avis admin est fourni pour les statuts Terminé
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

    // Notification
    await this.notificationService.sendStatusUpdate(updated);

    if (status === 'Terminé' && !avisAdmin) {
        throw new BadRequestException('L\'avis admin est obligatoire pour terminer un rendez-vous');
    }

    // Création procédure si favorable et terminé
    if (avisAdmin === 'Favorable' && status === 'Terminé') {
        const existingProcedure = await this.procedureService.findByEmailAndStatus(
            updated.email,
            'En cours'
        );

        if (!existingProcedure) {
            const newProcedure = await this.procedureService.createFromRendezvous(updated);
            
            // Envoyer un email de création de procédure
            await this.notificationService.sendProcedureCreation(newProcedure, updated);
        }
    }

    return updated;
}


   async getOccupiedSlots(date: string): Promise<string[]> {
    const results = await this.rendezvousModel.find({ 
        date, 
        status: { $ne: 'Annulé' } 
    }).select('time -_id').lean().exec();
    
    return results.map((r) => r.time);
}
  
    async getAvailableSlots(date: string): Promise<string[]> {
      // Vérifier si la date est valide (pas un weekend ou jour férié)
      if (this.isWeekend(date) || this.isHoliday(date)) {
        return [];
      }
  
      const occupiedSlots = await this.getOccupiedSlots(date);
      const allSlots = this.generateTimeSlots();
  
      // Si c'est aujourd'hui, filtrer les créneaux passés
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
        time,  // remplacer 'horaire'
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

  
    @Cron('0 9 * * *') // Tous les jours à 9h00
    async sendDailyReminders(): Promise<void> {
      const today = new Date().toISOString().split('T')[0];
      const rendezvous = await this.rendezvousModel.find({ 
        date: today,
        status: 'Confirmé'
      });
  
      for (const rdv of rendezvous) {
        try {
          await this.notificationService.sendReminder(rdv);
          this.logger.log(`Rappel envoyé pour le rendez-vous ${rdv._id}`);
        } catch (error) {
          this.logger.error(`Erreur d'envoi de rappel pour ${rdv._id}: ${error.message}`);
        }
      }
    }
  
    @Cron('0 * * * *') // Toutes les heures
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
  
    @Cron('0 * * * *') // Toutes les heures
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
  
    async getStats(startDate?: string, endDate?: string): Promise<any> {
      const match: any = {};
      
      if (startDate && endDate) {
        match.date = { $gte: startDate, $lte: endDate };
      } else if (startDate) {
        match.date = { $gte: startDate };
      } else if (endDate) {
        match.date = { $lte: endDate };
      }
  
      return this.rendezvousModel.aggregate([
        { $match: match },
        { 
          $group: {
            _id: '$destination',
            total: { $sum: 1 },
            confirmed: { 
              $sum: { 
                $cond: [{ $eq: ['$status', 'Confirmé'] }, 1, 0] 
              } 
            },
            pending: { 
              $sum: { 
                $cond: [{ $eq: ['$status', 'En attente'] }, 1, 0] 
              } 
            },
            completed: { 
              $sum: { 
                $cond: [{ $eq: ['$status', 'Terminé'] }, 1, 0] 
              } 
            },
            cancelled: { 
              $sum: { 
                $cond: [{ $eq: ['$status', 'Annulé'] }, 1, 0] 
              } 
            }
          }
        },
        { 
          $project: {
            destination: '$_id',
            _id: 0,
            total: 1,
            confirmed: 1,
            pending: 1,
            completed: 1,
            cancelled: 1
          }
        }
      ]);
    }

    async getDashboardStats(startDate?: string, endDate?: string) {
  // Si des dates sont fournies, utiliser la période spécifiée
  if (startDate || endDate) {
    const filter: any = {};
    
    if (startDate) {
      filter.date = { ...filter.date, $gte: startDate };
    }
    
    if (endDate) {
      filter.date = { ...filter.date, $lte: endDate };
    }
    
    const total = await this.rendezvousModel.countDocuments(filter);
    const todayCount = await this.rendezvousModel.countDocuments({ 
      ...filter, 
      date: new Date().toISOString().split('T')[0] 
    });
    
    return {
      total,
      today: todayCount,
      thisMonth: 0, // Non applicable pour une période personnalisée
      lastMonth: 0   // Non applicable pour une période personnalisée
    };
  }
  
  // Sinon, utiliser le calcul par défaut (aujourd'hui, ce mois, mois dernier)
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfLastMonth = lastMonth.toISOString().split('T')[0];
  const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split('T')[0];

  const total = await this.rendezvousModel.countDocuments({});
  const todayCount = await this.rendezvousModel.countDocuments({ date: today });
  const thisMonthCount = await this.rendezvousModel.countDocuments({ 
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });
  const lastMonthCount = await this.rendezvousModel.countDocuments({ 
    date: { $gte: startOfLastMonth, $lte: endOfLastMonth }
  });

  return {
    total,
    today: todayCount,
    thisMonth: thisMonthCount,
    lastMonth: lastMonthCount
  };
}
    
}