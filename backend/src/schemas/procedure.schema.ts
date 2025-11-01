import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Rendezvous } from './rendezvous.schema';

export type ProcedureDocument = Procedure & Document;

export enum ProcedureStatus {
  IN_PROGRESS = 'En cours',
  REJECTED = 'Refusée',
  CANCELLED = 'Annulée',
  COMPLETED = 'Terminée'
}

export enum StepStatus {
  PENDING = 'En attente',
  IN_PROGRESS = 'En cours',
  REJECTED = 'Refusé',
  COMPLETED = 'Terminé'
}

export enum StepName {
  ADMISSION = "Demande d'Admission",
  VISA = "Demande de Visa",
  TRAVEL = "Préparatifs de Voyage"
}

@Schema({
  timestamps: true,
  collection: 'procedures',
  versionKey: false
})
export class Procedure {
  @ApiProperty({ example: 'Jean', description: 'Prénom du client' })
  @Prop({ required: true, trim: true, maxlength: 50 })
  prenom: string;

  @ApiProperty({ example: 'Dupont', description: 'Nom du client' })
  @Prop({ required: true, trim: true, maxlength: 50 })
  nom: string;

  @ApiProperty({ example: 'jean.dupont@example.com', description: 'Email du client' })
  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  })
  email: string;

  @ApiProperty({ 
    example: 'France', 
    description: 'Destination de la procédure',
    enum: ['Algérie', 'Turquie', 'Maroc', 'France', 'Tunisie', 'Chine', 'Russie', 'Autre']
  })
  @Prop({
    required: true,
    enum: ['Algérie', 'Turquie', 'Maroc', 'France', 'Tunisie', 'Chine', 'Russie', 'Autre'],
    default: 'France'
  })
  destination: string;

  @ApiProperty({ 
    example: 'En cours', 
    description: 'Statut global de la procédure',
    enum: ProcedureStatus 
  })
  @Prop({
    required: true,
    enum: Object.values(ProcedureStatus),
    default: ProcedureStatus.IN_PROGRESS
  })
  statut: ProcedureStatus;

  @ApiProperty({ description: 'Étapes de la procédure' })
  @Prop({
    type: [{
      nom: { type: String, enum: Object.values(StepName), required: true },
      statut: { 
        type: String, 
        enum: Object.values(StepStatus), 
        default: StepStatus.PENDING
      },
      raisonRefus: { 
        type: String,
        required: false,
        trim: true,
        maxlength: 500
      },
      dateMaj: { type: Date, default: Date.now }
    }],
    default: []
  })
  steps: {
    nom: StepName;
    statut: StepStatus;
    raisonRefus?: string;
    dateMaj: Date;
  }[];

  @ApiProperty({ description: 'Rendez-vous associé' })
  @Prop({ type: Types.ObjectId, ref: 'Rendezvous', required: true, unique: true })
  rendezVousId: Types.ObjectId | Rendezvous;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ trim: true, maxlength: 500 })
  deletionReason?: string;

  // Virtuals
  readonly id: string;
  readonly progress: number;
  readonly currentStep: any;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const ProcedureSchema = SchemaFactory.createForClass(Procedure);

// Virtual pour la progression
ProcedureSchema.virtual('progress').get(function(this: ProcedureDocument) {
  const completedSteps = this.steps.filter(step => step.statut === StepStatus.COMPLETED).length;
  return Math.round((completedSteps / this.steps.length) * 100);
});

// Virtual pour l'étape en cours
ProcedureSchema.virtual('currentStep').get(function(this: ProcedureDocument) {
  return this.steps.find(step => step.statut === StepStatus.IN_PROGRESS) || 
         this.steps.find(step => step.statut === StepStatus.PENDING) ||
         this.steps[this.steps.length - 1];
});

// Hook pré-sauvegarde pour initialiser les étapes
ProcedureSchema.pre<ProcedureDocument>('save', function(next) {
  if (this.isNew && (!this.steps || this.steps.length === 0)) {
    this.steps = Object.values(StepName).map((name, index) => ({
      nom: name,
      statut: index === 0 ? StepStatus.IN_PROGRESS : StepStatus.PENDING,
      dateMaj: new Date()
    }));
  }
  next();
});

// Index pour optimiser les requêtes
ProcedureSchema.index({ statut: 1 });
ProcedureSchema.index({ destination: 1 });
ProcedureSchema.index({ rendezVousId: 1 }, { unique: true });
ProcedureSchema.index({ email: 1 });
ProcedureSchema.index({ createdAt: -1 });
ProcedureSchema.index({ isDeleted: 1 });