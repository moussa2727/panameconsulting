// procedure.service.ts - VERSION CORRIGÉE SANS ERREURS
import { 
    Injectable, 
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger,
    InternalServerErrorException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { 
    Procedure, 
    ProcedureStatus, 
    Step, 
    StepName, 
    StepStatus 
} from '../schemas/procedure.schema';
import { Rendezvous } from '../schemas/rendezvous.schema';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { NotificationService } from '../notification/notification.service';
import { UserRole } from '@/schemas/user.schema';

@Injectable()
export class ProcedureService {
  
    private readonly logger = new Logger(ProcedureService.name);

    constructor(
        @InjectModel(Procedure.name) private procedureModel: Model<Procedure>,
        @InjectModel(Rendezvous.name) private rendezvousModel: Model<Rendezvous>,
        private notificationService: NotificationService
    ) {}

    // ==================== CORE METHODS ====================

    async createFromRendezvous(createDto: CreateProcedureDto): Promise<Procedure> {
        const rendezvous = await this.rendezvousModel.findById(createDto.rendezVousId);
        if (!rendezvous) throw new BadRequestException('Rendez-vous non trouvé');

        // Validation stricte
        if (rendezvous.status !== 'Terminé') {
            throw new BadRequestException('Le rendez-vous doit être terminé');
        }
        if (rendezvous.avisAdmin !== 'Favorable') {
            throw new BadRequestException('L\'avis administratif doit être favorable');
        }

        const existingProcedure = await this.procedureModel.findOne({ 
            rendezVousId: createDto.rendezVousId,
            isDeleted: false
        });
        if (existingProcedure) throw new BadRequestException('Une procédure existe déjà');

        const procedureData = {
            rendezVousId: rendezvous._id,
            prenom: rendezvous.firstName,
            nom: rendezvous.lastName,
            email: rendezvous.email,
            telephone: rendezvous.telephone,
            destination: rendezvous.destination,
            niveauEtude: rendezvous.niveauEtude,
            filiere: rendezvous.filiere,
            statut: ProcedureStatus.IN_PROGRESS,
            steps: this.initializeSteps(rendezvous.destination),
            isDeleted: false
        };

        const procedure = await this.procedureModel.create(procedureData);
        
        this.logger.log(`✅ Procédure créée pour ${procedure.nom}`);
        await this.notificationService.sendProcedureCreation(procedure, rendezvous);

        return procedure;
    }

    async getProcedureDetails(id: string, user: any): Promise<Procedure> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('ID de procédure invalide');
        }

        const procedure = await this.procedureModel.findOne({ 
            _id: id, 
            isDeleted: false 
        }).populate('rendezVousId', 'firstName lastName date time status avisAdmin');

        if (!procedure) throw new NotFoundException('Procédure non trouvée');

        // Vérification d'accès
        if (procedure.email !== user.email && user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Accès non autorisé');
        }

        return procedure;
    }

    async updateProcedure(id: string, updateDto: UpdateProcedureDto): Promise<Procedure> {
        const procedure = await this.procedureModel.findByIdAndUpdate(
            id, 
            { ...updateDto, dateDerniereModification: new Date() }, 
            { new: true, runValidators: true }
        );

        if (!procedure) throw new NotFoundException('Procédure non trouvée');
        
        this.logger.log(`📝 Procédure ${id} mise à jour`);
        return procedure;
    }

    // procedure.service.ts - CORRECTION DE LA MÉTHODE updateStep
async updateStep(
    id: string, 
    stepName: string, 
    updateDto: UpdateStepDto
): Promise<Procedure> {
    try {
        this.logger.log(`🔄 Début mise à jour étape - ID: ${id}, Étape: ${stepName}`);
        
        // ✅ DÉCODAGE SÉCURISÉ
        let decodedStepName: string;
        try {
            decodedStepName = decodeURIComponent(stepName);
            this.logger.log(`🔍 Étape décodée: "${decodedStepName}"`);
        } catch (decodeError) {
            throw new BadRequestException(`Nom d'étape mal formé: ${stepName}`);
        }
        
        // ✅ VALIDATION DU NOM D'ÉTAPE
        const validStepNames = Object.values(StepName);
        if (!validStepNames.includes(decodedStepName as StepName)) {
            this.logger.error(`❌ Nom d'étape invalide: "${decodedStepName}". Valides: ${validStepNames.join(', ')}`);
            throw new BadRequestException(
                `Nom d'étape invalide: "${decodedStepName}". ` +
                `Étapes valides: ${validStepNames.join(', ')}`
            );
        }

        // ✅ RECHERCHE DE LA PROCÉDURE
        const procedure = await this.procedureModel.findById(id).exec();
        if (!procedure) {
            this.logger.error(`❌ Procédure non trouvée: ${id}`);
            throw new NotFoundException('Procédure non trouvée');
        }

        // ✅ RECHERCHE DE L'ÉTAPE
        const stepIndex = procedure.steps.findIndex((step: Step) => step.nom === decodedStepName);
        if (stepIndex === -1) {
            this.logger.error(`❌ Étape non trouvée: "${decodedStepName}" dans la procédure ${id}`);
            throw new NotFoundException(`Étape "${decodedStepName}" non trouvée dans cette procédure`);
        }

        // ✅ VALIDATION DES DONNÉES DE MISE À JOUR
        if (updateDto.statut === StepStatus.REJECTED && !updateDto.raisonRefus) {
            throw new BadRequestException('La raison du refus est obligatoire lorsque le statut est "Rejeté"');
        }

        const now = new Date();

        // ✅ CORRECTION CRITIQUE: PRÉSERVER TOUTES LES PROPRIÉTÉS EXISTANTES
        const existingStep = procedure.steps[stepIndex];
        
        // Construction de l'étape mise à jour en préservant toutes les propriétés
        const updatedStep: Step = {
            ...existingStep, // ✅ GARDE toutes les propriétés existantes
            dateMaj: now
        };

        // Mettre à jour seulement les champs fournis
        if (updateDto.statut !== undefined) {
            updatedStep.statut = updateDto.statut;
        }

        if (updateDto.raisonRefus !== undefined) {
            updatedStep.raisonRefus = updateDto.raisonRefus;
        }

        // ✅ MISE À JOUR SÉCURISÉE
        procedure.steps[stepIndex] = updatedStep;

        // ✅ MISE À JOUR DU STATUT GLOBAL
        this.updateProcedureGlobalStatus(procedure);

        // ✅ SAUVEGARDE
        const savedProcedure = await procedure.save();

        // ✅ GESTION DE L'ÉTAPE SUIVANTE (si étape terminée)
        if (updateDto.statut === StepStatus.COMPLETED && stepIndex < procedure.steps.length - 1) {
            const nextStep = procedure.steps[stepIndex + 1];
            if (nextStep.statut === StepStatus.PENDING) {
                nextStep.statut = StepStatus.IN_PROGRESS;
                nextStep.dateMaj = now;
                await procedure.save();
            }
        }

        // ✅ NOTIFICATION
        try {
            await this.notificationService.sendProcedureUpdate(savedProcedure);
        } catch (notificationError) {
            this.logger.warn(`⚠️ Erreur notification: ${notificationError.message}`);
        }

        return savedProcedure;

    } catch (error) {
        this.logger.error(`❌ Erreur critique mise à jour étape "${stepName}" pour ${id}:`, error);
        
        if (error instanceof BadRequestException || 
            error instanceof NotFoundException) {
            throw error;
        }
        
        throw new InternalServerErrorException(`Erreur lors de la mise à jour de l'étape: ${error.message}`);
    }
}

    async findByEmail(email: string): Promise<Procedure[]> {
        if (!email) {
            throw new BadRequestException('Email est requis');
        }

        return this.procedureModel.find({ 
            email: email.toLowerCase(), 
            isDeleted: false 
        }).populate('rendezVousId', 'firstName lastName date time status avisAdmin');
    }

    private updateProcedureGlobalStatus(procedure: Procedure): void {
        if (!procedure.steps || procedure.steps.length === 0) {
            procedure.statut = ProcedureStatus.IN_PROGRESS;
            return;
        }

        const allCompleted = procedure.steps.every((step: Step) => step.statut === StepStatus.COMPLETED);
        const anyRejected = procedure.steps.some((step: Step) => step.statut === StepStatus.REJECTED);
        const anyCancelled = procedure.steps.some((step: Step) => step.statut === StepStatus.CANCELLED);

        if (anyRejected) {
            procedure.statut = ProcedureStatus.REJECTED;
            const rejectedStep = procedure.steps.find((step: Step) => step.statut === StepStatus.REJECTED);
            procedure.raisonRejet = rejectedStep?.raisonRefus;
        } else if (anyCancelled) {
            procedure.statut = ProcedureStatus.CANCELLED;
        } else if (allCompleted) {
            procedure.statut = ProcedureStatus.COMPLETED;
            procedure.dateCompletion = new Date(); // ✅ MAINTENANT VALIDE
        } else {
            procedure.statut = ProcedureStatus.IN_PROGRESS;
        }
    }

    // ==================== USER METHODS ====================

    async getUserProcedures(email: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        const query = { email: email.toLowerCase(), isDeleted: false };

        const [data, total] = await Promise.all([
            this.procedureModel.find(query)
                .populate('rendezVousId', 'firstName lastName date time status')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            this.procedureModel.countDocuments(query)
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async cancelProcedure(id: string, userEmail: string, reason?: string): Promise<Procedure> {
        const procedure = await this.procedureModel.findById(id);
        if (!procedure) throw new NotFoundException('Procédure non trouvée');

        if (procedure.email !== userEmail.toLowerCase()) {
            throw new ForbiddenException('Vous ne pouvez annuler que vos propres procédures');
        }

        if ([ProcedureStatus.COMPLETED, ProcedureStatus.CANCELLED].includes(procedure.statut)) {
            throw new BadRequestException('Procédure déjà finalisée');
        }

        procedure.isDeleted = true;
        procedure.deletedAt = new Date();
        procedure.deletionReason = reason || 'Annulée par l\'utilisateur';
        procedure.statut = ProcedureStatus.CANCELLED;
        procedure.steps.forEach(step => {
            if ([StepStatus.IN_PROGRESS, StepStatus.PENDING].includes(step.statut)) {
                step.statut = StepStatus.CANCELLED;
                step.dateMaj = new Date();
            }
        });

        const savedProcedure = await procedure.save();
        await this.notificationService.sendCancellationNotification(savedProcedure);

        this.logger.log(`❌ Procédure annulée par l'utilisateur: ${procedure.email}`);
        return savedProcedure;
    }

    // ==================== ADMIN METHODS ====================

    async getAllProcedures(page: number = 1, limit: number = 10, email?: string) {
        const skip = (page - 1) * limit;
        const query: any = { isDeleted: false };
        
        if (email) query.email = email.toLowerCase();

        const [data, total] = await Promise.all([
            this.procedureModel.find(query)
                .populate('rendezVousId', 'firstName lastName date time status avisAdmin')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            this.procedureModel.countDocuments(query)
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

   // procedure.service.ts - SOFT DELETE AMÉLIORÉ
async softDelete(id: string, reason?: string): Promise<Procedure> {
    const procedure = await this.procedureModel.findById(id);
    if (!procedure) throw new NotFoundException('Procédure non trouvée');

    // ✅ SOFT DELETE: Marquer comme supprimé sans effacer
    procedure.isDeleted = true;
    procedure.deletedAt = new Date();
    procedure.deletionReason = reason || 'Supprimée par l\'administrateur';
    procedure.statut = ProcedureStatus.CANCELLED;

    // Annuler toutes les étapes en cours
    procedure.steps.forEach(step => {
        if ([StepStatus.IN_PROGRESS, StepStatus.PENDING].includes(step.statut)) {
            step.statut = StepStatus.CANCELLED;
            step.dateMaj = new Date();
        }
    });

    const savedProcedure = await procedure.save();
    
    this.logger.log(`🗑️ Procédure marquée comme supprimée (soft delete): ${id}`);
    return savedProcedure;
}

async getActiveProcedures(page: number = 1, limit: number = 10, email?: string) {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false }; // ✅ SEULEMENT LES NON SUPPRIMÉES
    
    if (email) query.email = email.toLowerCase();

    const [data, total] = await Promise.all([
        this.procedureModel.find(query)
            .select('prenom nom email telephone destination filiere statut steps createdAt') // ✅ SEULEMENT LES CHAMPS SOUHAITÉS
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }),
        this.procedureModel.countDocuments(query)
    ]);

    return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
}    



    async getProceduresOverview() {
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
    }

    // ==================== UTILITY METHODS ====================

    private initializeSteps(destination: string): Step[] {
        const steps: Step[] = [
            { 
                nom: StepName.DEMANDE_ADMISSION,
                statut: StepStatus.IN_PROGRESS,
                dateCreation: new Date(),
                dateMaj: new Date()
            },
            { 
                nom: StepName.DEMANDE_VISA,
                statut: StepStatus.PENDING,
                dateCreation: new Date(),
                dateMaj: new Date()
            }
        ];

        const destinationsAvecVoyage = ['Canada', 'France', 'États-Unis', 'Royaume-Uni', 'Australie'];
        if (destinationsAvecVoyage.includes(destination)) {
            steps.push({ 
                nom: StepName.PREPARATIF_VOYAGE,
                statut: StepStatus.PENDING,
                dateCreation: new Date(),
                dateMaj: new Date()
            });
        }

        return steps;
    }

    async rejectProcedure(id: string, reason: string): Promise<Procedure> {
        const procedure = await this.procedureModel.findById(id);
        if (!procedure) throw new NotFoundException('Procédure non trouvée');

        procedure.statut = ProcedureStatus.REJECTED;
        procedure.raisonRejet = reason;
        
        // Rejeter toutes les étapes en cours
        procedure.steps.forEach(step => {
            if ([StepStatus.PENDING, StepStatus.IN_PROGRESS].includes(step.statut)) {
                step.statut = StepStatus.REJECTED;
                step.raisonRefus = reason;
                step.dateMaj = new Date();
            }
        });

        const saved = await procedure.save();
        await this.notificationService.sendProcedureUpdate(saved);
        
        this.logger.log(`❌ Procédure rejetée: ${id}`);
        return saved;
    }
}