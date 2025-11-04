import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum StepStatus {
  PENDING = 'En attente',
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminé',
  REJECTED = 'Rejeté',
  CANCELLED = 'Annulé'  
}

export enum StepName {
  DOCUMENT_COLLECTION = 'Collecte des documents',
  DOCUMENT_REVIEW = 'Révision des documents',
  PAYMENT_PROCESSING = 'Traitement du paiement',
  ADMINISTRATIVE_PROCESSING = 'Traitement administratif',
  FINAL_APPROVAL = 'Approbation finale',
  COMPLETION = 'Finalisation'
}

export enum ProcedureStatus {
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminée',
  REJECTED = 'Refusée',
  CANCELLED = 'Annulée'
}

@Schema({ timestamps: true })
export class Step {
  @Prop({ type: String, enum: StepName, required: true })
  nom: StepName;

  @Prop({ type: String, enum: StepStatus, default: StepStatus.PENDING })
  statut: StepStatus;

  @Prop({ type: String })
  raisonRefus?: string;

  @Prop({ type: Date, default: Date.now })
  dateMaj: Date;
}

export const StepSchema = SchemaFactory.createForClass(Step);

@Schema({ timestamps: true })
export class Procedure extends Document {
  @Prop({ type: String, required: true })
  prenom: string;

  @Prop({ type: String, required: true })
  nom: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  destination: string;

  @Prop({ type: String, enum: ProcedureStatus, default: ProcedureStatus.IN_PROGRESS })
  statut: ProcedureStatus;

  @Prop({ type: [StepSchema], default: [] })
  steps: Step[];

  @Prop({ type: Types.ObjectId, ref: 'Rendezvous', required: true })
  rendezVousId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: String })
  deletionReason?: string;
}

export const ProcedureSchema = SchemaFactory.createForClass(Procedure);