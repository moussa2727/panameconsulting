import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ 
  timestamps: true,
  collection: 'revoked_tokens' // Nom explicite pour la collection MongoDB
})
export class RevokedToken extends Document {
  @Prop({ 
    required: true, 
    unique: true,
    index: true // Ajout d'un index pour les recherches par token
  })
  token: string;

  @Prop({ 
    required: true,
    index: { expires: 0 } // Index pour expiration automatique (à gérer manuellement)
  })
  expiresAt: Date;

  @Prop({
    required: true,
    index: true // Index pour les recherches par userId
  })
  userId: string;
}

export const RevokedTokenSchema = SchemaFactory.createForClass(RevokedToken);
RevokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Export du type Document complet
export type RevokedTokenDocument = RevokedToken & Document & {
  createdAt: Date;
  updatedAt: Date;
};