import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, now } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({
  timestamps: true,  // Ajoute automatiquement createdAt et updatedAt
  versionKey: false, // Désactive le champ __v
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
})
export class Destination extends Document {
  @ApiProperty({ example: 'France', description: 'Nom du pays' })
  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  })
  
  country: string;

  @ApiProperty({ 
    example: '/france.webp', 
    description: 'Chemin de l\'image' 
  })
  @Prop({
    type: String,
    required: true,
  })
  imagePath: string;

  @ApiProperty({ 
    example: 'Procédure complète pour visa étudiant', 
    description: 'Description de la destination' 
  })
  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 500,
  })
  text: string;

  // Timestamps automatiques (grâce à l'option timestamps: true)
  createdAt: Date;
  updatedAt: Date;
}

export const DestinationSchema = SchemaFactory.createForClass(Destination);

// Index pour optimiser les recherches par pays
DestinationSchema.index({ country: 1 }, { unique: false });