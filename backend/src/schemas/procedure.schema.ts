import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
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
  toJSON: {
    virtuals: true,
    transform: (doc: any, ret: { __v: any; id: any; _id: any; }) => {
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
    }
  }
})
export class Procedure {
  @Prop({ required: true, trim: true, maxlength: 50 })
  prenom: string;

  @Prop({ required: true, trim: true, maxlength: 50 })
  nom: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  })
  email: string;

  @Prop({
    required: true,
    enum: ['Algérie', 'Tunisie', 'Maroc', 'France', 'Chine', 'Russie', 'Chypre'],
    default: 'France'
  })
  destination: string;

  @Prop({
    required: true,
    enum: Object.values(ProcedureStatus),
    default: ProcedureStatus.IN_PROGRESS
  })
  statut: ProcedureStatus;

  @Prop({
    type: [{
      nom: { type: String, enum: Object.values(StepName), required: true },
      statut: { 
        type: String, 
        enum: Object.values(StepStatus), 
        default: function(this: any) {
          return this.nom === StepName.ADMISSION ? StepStatus.IN_PROGRESS : StepStatus.PENDING;
        }
      },
      raisonRefus: { 
        type: String,
        required: function(this: any) {
          return this.statut === StepStatus.REJECTED;
        },
        trim: true,
        maxlength: 500
      },
      dateMaj: { type: Date, default: Date.now }
    }],
    validate: {
      validator: (steps: any[]) => steps.length === Object.values(StepName).length,
      message: 'Toutes les étapes doivent être présentes'
    }
  })
  steps: {
    nom: StepName;
    statut: StepStatus;
    raisonRefus?: string;
    dateMaj: Date;
  }[];

  @Prop({ type: Types.ObjectId, ref: 'Rendezvous', required: true })
  rendezVousId: Types.ObjectId | Rendezvous;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop()
  deletionReason?: string;

  // Méthodes virtuelles
  public getProgressPercentage?: () => number;
}

export const ProcedureSchema = SchemaFactory.createForClass(Procedure);

// Méthode virtuelle pour calculer la progression
ProcedureSchema.virtual('progress').get(function(this: ProcedureDocument) {
  const completedSteps = this.steps.filter(step => step.statut === StepStatus.COMPLETED).length;
  return Math.round((completedSteps / this.steps.length) * 100);
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

// Hook post-sauvegarde pour mettre à jour le statut global
ProcedureSchema.post<ProcedureDocument>('save', function(doc) {
  if (doc.steps.some(step => step.statut === StepStatus.REJECTED)) {
    doc.statut = ProcedureStatus.REJECTED;
  } else if (doc.steps.every(step => step.statut === StepStatus.COMPLETED)) {
    doc.statut = ProcedureStatus.COMPLETED;
  } else {
    doc.statut = ProcedureStatus.IN_PROGRESS;
  }

  if (doc.isModified('statut')) {
    doc.save();
  }
});

// Index pour optimiser les requêtes
ProcedureSchema.index({ statut: 1 });
ProcedureSchema.index({ destination: 1 });
ProcedureSchema.index({ rendezVousId: 1 }, { unique: true });
ProcedureSchema.index({ email: 1 });
ProcedureSchema.index({ createdAt: -1 });
ProcedureSchema.index({ isDeleted: 1 });