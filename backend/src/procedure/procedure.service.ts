import { 
  BadRequestException, 
  ForbiddenException, 
  Injectable, 
  InternalServerErrorException, 
  NotFoundException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Procedure, ProcedureDocument, ProcedureStatus, StepName, StepStatus } from '../schemas/procedure.schema';
import { Rendezvous } from '../schemas/rendezvous.schema';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { UpdateStepDto } from './dto/update-step.dto';

@Injectable()
export class ProcedureService {
  constructor(
    @InjectModel(Procedure.name) private procedureModel: Model<ProcedureDocument>
  ) {}

  async create(createDto: CreateProcedureDto): Promise<Procedure> {
    try {
      const createdProcedure = new this.procedureModel(createDto);
      return await createdProcedure.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Une procédure existe déjà pour ce rendez-vous');
      }
      throw new InternalServerErrorException('Erreur lors de la création de la procédure');
    }
  }

  async findAll(page: number = 1, limit: number = 10, email?: string): Promise<{ data: Procedure[]; total: number }> {
    const skip = (page - 1) * limit;
    const query = email ? { email, isDeleted: false } : { isDeleted: false };
    
    try {
      const [data, total] = await Promise.all([
        this.procedureModel.find(query)
          .populate('rendezVousId', 'firstName lastName date time status')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        this.procedureModel.countDocuments(query).exec()
      ]);

      return { data, total };
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors de la récupération des procédures');
    }
  }

  async findOne(id: string): Promise<Procedure> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de procédure invalide');
    }

    try {
      const procedure = await this.procedureModel.findOne({ _id: id, isDeleted: false })
        .populate('rendezVousId', 'firstName lastName date time status')
        .exec();

      if (!procedure) {
        throw new NotFoundException('Procédure non trouvée');
      }

      return procedure;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erreur lors de la récupération de la procédure');
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
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erreur lors de la mise à jour de la procédure');
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

      return await procedure.save();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erreur lors de la suppression de la procédure');
    }
  }

  async cancelByUser(id: string, email: string, reason?: string): Promise<Procedure> {
    try {
      const procedure = await this.procedureModel.findById(id).exec();
      if (!procedure) {
        throw new NotFoundException('Procédure non trouvée');
      }
      if (procedure.email !== email) {
        throw new ForbiddenException('Vous ne pouvez annuler que vos propres procédures');
      }
      if (procedure.statut === ProcedureStatus.COMPLETED || procedure.statut === ProcedureStatus.CANCELLED) {
        throw new BadRequestException('Procédure déjà finalisée');
      }

      procedure.isDeleted = true;
      procedure.deletedAt = new Date();
      procedure.deletionReason = reason || 'Annulée par l\'utilisateur';
      procedure.statut = ProcedureStatus.CANCELLED;

      return await procedure.save();
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Erreur lors de l\'annulation de la procédure');
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

      const stepIndex = procedure.steps.findIndex(s => s.nom === stepName);
      if (stepIndex === -1) {
        throw new NotFoundException('Étape non trouvée');
      }

      if (updateDto.statut === StepStatus.REJECTED && !updateDto.raisonRefus) {
        throw new BadRequestException('La raison du refus est obligatoire');
      }

      // Si on termine une étape, passer automatiquement à l'étape suivante
      if (updateDto.statut === StepStatus.COMPLETED && stepIndex < procedure.steps.length - 1) {
        const nextStep = procedure.steps[stepIndex + 1];
        if (nextStep.statut === StepStatus.PENDING) {
          nextStep.statut = StepStatus.IN_PROGRESS;
          nextStep.dateMaj = new Date();
        }
      }

      procedure.steps[stepIndex] = {
        ...procedure.steps[stepIndex],
        ...updateDto,
        dateMaj: new Date()
      };

      return await procedure.save();
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Erreur lors de la mise à jour de l\'étape');
    }
  }

  async getDashboardStats() {
    try {
      const inProgressCount = await this.procedureModel.countDocuments({ 
        statut: ProcedureStatus.IN_PROGRESS,
        isDeleted: false
      });
      
      const totalCount = await this.procedureModel.countDocuments({ isDeleted: false });
      const completedCount = await this.procedureModel.countDocuments({ 
        statut: ProcedureStatus.COMPLETED,
        isDeleted: false
      });

      return { inProgressCount, totalCount, completedCount };
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors de la récupération des statistiques');
    }
  }

  async getStats() {
    try {
      const stats = await this.procedureModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$statut',
            count: { $sum: 1 }
          }
        }
      ]);
      
      return {
        byStatus: stats,
        inProgressCount: stats.find(s => s._id === ProcedureStatus.IN_PROGRESS)?.count || 0
      };
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors de la récupération des statistiques détaillées');
    }
  }

  async findByEmailAndStatus(email: string, statut: string): Promise<Procedure | null> {
    try {
      return await this.procedureModel.findOne({ 
        email, 
        statut,
        isDeleted: false 
      }).exec();
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors de la recherche de procédure');
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

        return await procedure.save();
    } catch (error) {
        throw new InternalServerErrorException('Erreur lors de la création de la procédure depuis le rendez-vous');
    }
}

  async getCurrentStep(procedureId: string): Promise<any> {
    try {
      const procedure = await this.procedureModel.findOne({ 
        _id: procedureId, 
        isDeleted: false 
      }).exec();
      
      if (!procedure) {
        throw new NotFoundException('Procédure non trouvée');
      }

      const currentStep = procedure.steps.find(step => 
        step.statut === StepStatus.IN_PROGRESS
      );

      return {
        procedure: {
          _id: procedure._id,
          prenom: procedure.prenom,
          nom: procedure.nom,
          destination: procedure.destination,
          statut: procedure.statut,
          progress: Math.round((procedure.steps.filter(s => s.statut === StepStatus.COMPLETED).length / procedure.steps.length) * 100)
        },
        currentStep
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erreur lors de la récupération de l\'étape en cours');
    }
  }

  async findAllForUser(email: string): Promise<Procedure[]> {
    try {
      return await this.procedureModel.find({ 
        email, 
        isDeleted: false 
      })
      .select('prenom nom email destination statut steps.nom steps.statut steps.dateMaj createdAt')
      .sort({ createdAt: -1 })
      .exec();
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors de la récupération des procédures utilisateur');
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

      return await procedure.save();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erreur lors de la restauration de la procédure');
    }
  }
}