import { 
    Injectable, 
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { 
    Procedure, 
    ProcedureStatus, 
    StepName, 
    StepStatus 
} from '../schemas/procedure.schema';
import { Rendezvous } from '../schemas/rendezvous.schema';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ProcedureService {
    private readonly logger = new Logger(ProcedureService.name);

    constructor(
        @InjectModel(Procedure.name) 
        private procedureModel: Model<Procedure>,
        private notificationService: NotificationService
    ) {}

    async create(createDto: CreateProcedureDto): Promise<Procedure> {
        try {
            // Vérifier si une procédure existe déjà pour ce rendez-vous
            const existing = await this.procedureModel.findOne({ 
                rendezVousId: createDto.rendezVousId 
            });
            if (existing) {
                throw new BadRequestException('Une procédure existe déjà pour ce rendez-vous');
            }

            const steps = Object.values(StepName).map((nom, index) => ({
                nom,
                statut: index === 0 ? StepStatus.IN_PROGRESS : StepStatus.PENDING,
                dateMaj: new Date()
            }));

            const createdProcedure = new this.procedureModel({
                ...createDto,
                statut: ProcedureStatus.IN_PROGRESS,
                steps,
                isDeleted: false
            });

            const savedProcedure = await createdProcedure.save();

            this.logger.log(`Nouvelle procédure créée pour ${savedProcedure.email}`);
            return savedProcedure;
        } catch (error) {
            this.logger.error(`Erreur création procédure: ${error.message}`);
            throw error;
        }
    }

    // Dans procedure.service.ts, modifiez la méthode findAll :
async findAll(
    page: number = 1, 
    limit: number = 10, 
    email?: string
): Promise<{ data: Procedure[]; total: number; page: number; limit: number; totalPages: number }> {
    
    console.log('🔍 ProcedureService.findAll appelé avec:', { page, limit, email });
    
    const skip = (page - 1) * limit;
    
    const query: any = { isDeleted: false };
    if (email) {
        query.email = email.toLowerCase();
        console.log('📧 Filtrage par email:', email);
    }

    try {
        const [data, total] = await Promise.all([
            this.procedureModel.find(query)
                .populate('rendezVousId', 'firstName lastName date time status')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .exec(),
            this.procedureModel.countDocuments(query)
        ]);

        console.log(`✅ ${data.length} procédures trouvées pour ${email}`);
        
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    } catch (error) {
        console.error('❌ Erreur récupération procédures:', error);
        throw error;
    }
}

    async findOne(id: string): Promise<Procedure> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('ID de procédure invalide');
        }

        try {
            const procedure = await this.procedureModel.findOne({ 
                _id: id, 
                isDeleted: false 
            })
            .populate('rendezVousId', 'firstName lastName date time status')
            .exec();

            if (!procedure) {
                throw new NotFoundException('Procédure non trouvée');
            }

            return procedure;
        } catch (error) {
            this.logger.error(`Erreur récupération procédure ${id}: ${error.message}`);
            throw error;
        }
    }

    async update(id: string, updateDto: UpdateProcedureDto): Promise<Procedure> {
        try {
            const updated = await this.procedureModel.findByIdAndUpdate(
                id, 
                updateDto, 
                { new: true, runValidators: true }
            ).exec();
            
            if (!updated) {
                throw new NotFoundException('Procédure non trouvée');
            }

            this.logger.log(`Procédure ${id} mise à jour`);
            return updated;
        } catch (error) {
            this.logger.error(`Erreur mise à jour procédure ${id}: ${error.message}`);
            throw error;
        }
    }

    async updateStep(
        id: string, 
        stepName: string, 
        updateDto: UpdateStepDto
    ): Promise<Procedure> {
        try {
            const procedure = await this.procedureModel.findById(id).exec();
            if (!procedure) {
                throw new NotFoundException('Procédure non trouvée');
            }

            const stepIndex = procedure.steps.findIndex((s: { nom: string; }) => s.nom === stepName);
            if (stepIndex === -1) {
                throw new NotFoundException('Étape non trouvée');
            }

            // Validation pour le refus
            if (updateDto.statut === StepStatus.REJECTED && !updateDto.raisonRefus) {
                throw new BadRequestException('La raison du refus est obligatoire');
            }

            // Mettre à jour l'étape
            procedure.steps[stepIndex] = {
                ...procedure.steps[stepIndex],
                ...updateDto,
                dateMaj: new Date()
            };

            // Passer à l'étape suivante si l'étape actuelle est terminée
            if (updateDto.statut === StepStatus.COMPLETED && stepIndex < procedure.steps.length - 1) {
                const nextStep = procedure.steps[stepIndex + 1];
                if (nextStep.statut === StepStatus.PENDING) {
                    nextStep.statut = StepStatus.IN_PROGRESS;
                    nextStep.dateMaj = new Date();
                }
            }

            const savedProcedure = await procedure.save();

            // Notifier l'utilisateur du changement d'étape
            await this.notificationService.sendProcedureUpdate(savedProcedure);

            this.logger.log(`Étape ${stepName} mise à jour pour la procédure ${id}`);
            return savedProcedure;
        } catch (error) {
            this.logger.error(`Erreur mise à jour étape ${stepName} pour ${id}: ${error.message}`);
            throw error;
        }
    }

    async softRemove(id: string, reason?: string): Promise<Procedure> {
        try {
            const procedure = await this.procedureModel.findById(id).exec();
            if (!procedure) {
                throw new NotFoundException('Procédure non trouvée');
            }

            procedure.isDeleted = true;
            procedure.deletedAt = new Date();
            procedure.deletionReason = reason;
            procedure.statut = ProcedureStatus.CANCELLED;

            const savedProcedure = await procedure.save();
            this.logger.log(`Procédure ${id} supprimée (soft delete)`);
            return savedProcedure;
        } catch (error) {
            this.logger.error(`Erreur suppression procédure ${id}: ${error.message}`);
            throw error;
        }
    }

    async cancelByUser(id: string, email: string, reason?: string): Promise<Procedure> {
        try {
            const procedure = await this.procedureModel.findById(id).exec();
            if (!procedure) {
                throw new NotFoundException('Procédure non trouvée');
            }
    
            if (procedure.email !== email.toLowerCase()) {
                throw new ForbiddenException('Vous ne pouvez annuler que vos propres procédures');
            }
    
            if (procedure.statut === ProcedureStatus.COMPLETED || procedure.statut === ProcedureStatus.CANCELLED) {
                throw new BadRequestException('Procédure déjà finalisée');
            }
    
            procedure.isDeleted = true;
            procedure.deletedAt = new Date();
            procedure.deletionReason = reason || 'Annulée par l\'utilisateur';
            procedure.statut = ProcedureStatus.CANCELLED;
    
            // Marquer toutes les étapes comme annulées
            procedure.steps.forEach(step => {
                if (step.statut === StepStatus.IN_PROGRESS || step.statut === StepStatus.PENDING) {
                    step.statut = StepStatus.CANCELLED;
                    step.dateMaj = new Date();
                }
            });
    
            const savedProcedure = await procedure.save();
            
            // Notifier l'administrateur de l'annulation
            await this.notificationService.sendCancellationNotification(savedProcedure);
    
            this.logger.log(`Procédure ${id} annulée par l'utilisateur ${email}`);
            return savedProcedure;
        } catch (error) {
            this.logger.error(`Erreur annulation procédure ${id}: ${error.message}`);
            throw error;
        }
    }

    async restoreProcedure(id: string): Promise<Procedure> {
        try {
            const procedure = await this.procedureModel.findById(id).exec();
            if (!procedure) {
                throw new NotFoundException('Procédure non trouvée');
            }

            procedure.isDeleted = false;
            procedure.deletedAt = undefined;
            procedure.deletionReason = undefined;
            procedure.statut = ProcedureStatus.IN_PROGRESS;

            const savedProcedure = await procedure.save();
            this.logger.log(`Procédure ${id} restaurée`);
            return savedProcedure;
        } catch (error) {
            this.logger.error(`Erreur restauration procédure ${id}: ${error.message}`);
            throw error;
        }
    }

    async createFromRendezvous(rendezvous: Rendezvous): Promise<Procedure> {
        try {
            const steps = Object.values(StepName).map((nom, index) => ({
                nom,
                statut: index === 0 ? StepStatus.IN_PROGRESS : StepStatus.PENDING,
                dateMaj: new Date()
            }));

            const procedure = new this.procedureModel({
                prenom: rendezvous.firstName,
                nom: rendezvous.lastName,
                email: rendezvous.email,
                destination: rendezvous.destination === 'Autre' ? rendezvous.destinationAutre : rendezvous.destination,
                statut: ProcedureStatus.IN_PROGRESS,
                rendezVousId: rendezvous._id,
                steps,
                isDeleted: false
            });

            const savedProcedure = await procedure.save();
            this.logger.log(`Procédure créée depuis rendez-vous ${rendezvous._id}`);
            return savedProcedure;
        } catch (error) {
            this.logger.error(`Erreur création procédure depuis rendez-vous: ${error.message}`);
            throw error;
        }
    }

    async getDashboardStats(): Promise<{ 
        inProgressCount: number; 
        totalCount: number; 
        completedCount: number;
        rejectedCount: number;
        cancelledCount: number;
    }> {
        try {
            const [inProgressCount, totalCount, completedCount, rejectedCount, cancelledCount] = await Promise.all([
                this.procedureModel.countDocuments({ 
                    statut: ProcedureStatus.IN_PROGRESS,
                    isDeleted: false 
                }),
                this.procedureModel.countDocuments({ isDeleted: false }),
                this.procedureModel.countDocuments({ 
                    statut: ProcedureStatus.COMPLETED,
                    isDeleted: false 
                }),
                this.procedureModel.countDocuments({ 
                    statut: ProcedureStatus.REJECTED,
                    isDeleted: false 
                }),
                this.procedureModel.countDocuments({ 
                    statut: ProcedureStatus.CANCELLED,
                    isDeleted: false 
                })
            ]);

            return { inProgressCount, totalCount, completedCount, rejectedCount, cancelledCount };
        } catch (error) {
            this.logger.error(`Erreur récupération stats dashboard: ${error.message}`);
            throw error;
        }
    }

    async getStats(): Promise<{ 
        byStatus: any[]; 
        byDestination: any[];
        total: number;
    }> {
        try {
            const [byStatus, byDestination, total] = await Promise.all([
                this.procedureModel.aggregate([
                    { $match: { isDeleted: false } },
                    { $group: { _id: '$statut', count: { $sum: 1 } } }
                ]),
                this.procedureModel.aggregate([
                    { $match: { isDeleted: false } },
                    { $group: { _id: '$destination', count: { $sum: 1 } } }
                ]),
                this.procedureModel.countDocuments({ isDeleted: false })
            ]);

            return { byStatus, byDestination, total };
        } catch (error) {
            this.logger.error(`Erreur récupération stats détaillées: ${error.message}`);
            throw error;
        }
    }

    async findByEmailAndStatus(email: string, statut: string): Promise<Procedure[]> {
        try {
            return await this.procedureModel.find({ 
                email: email.toLowerCase(), 
                statut,
                isDeleted: false 
            })
            .sort({ createdAt: -1 })
            .exec();
        } catch (error) {
            this.logger.error(`Erreur recherche procédures par email/statut: ${error.message}`);
            throw error;
        }
    }
}