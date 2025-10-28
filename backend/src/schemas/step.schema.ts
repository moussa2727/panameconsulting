import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StepDocument = Step & Document;

@Schema({ _id: false })
export class Step {
  @Prop({ 
    required: true, 
    enum: ["Demande d'Admission", "Demande de Visa", "Préparatifs de Voyage"] 
  })
  nom: string;

  @Prop({ 
    required: true, 
    enum: ['En cours', 'Refusé', 'Terminé'],
    default: 'En cours'
  })
  statut: string;

  @Prop({ 
    required: function() {
      return this.statut === 'Refusé';
    },
    trim: true,
    maxlength: 500
  })
  raisonRefus?: string;

  @Prop({ default: Date.now })
  dateMaj: Date;
}

export const StepSchema = SchemaFactory.createForClass(Step);