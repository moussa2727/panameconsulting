import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

@Schema({
  timestamps: true,
  collection: 'password_reset_tokens',
  autoIndex: true
})
export class ResetToken extends Document {
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true
  })
  token: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  })
  user: User;

  @Prop({
    type: Date,
    required: true,
    index: { expires: '1h' } // Auto-expire après 1 heure
  })
  expiresAt: Date;

  @Prop({
    type: Boolean,
    default: false,
    index: true
  })
  used: boolean;

  @Prop({
    type: String,
    enum: ['pending', 'used', 'expired'],
    default: 'pending'
  })
  status: string;

}

export const ResetTokenSchema = SchemaFactory.createForClass(ResetToken);
ResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Index composé pour les requêtes fréquentes
ResetTokenSchema.index({ token: 1, user: 1, used: 1 });

// Middleware pour empêcher la réutilisation des tokens
ResetTokenSchema.pre('save', function(next) {
  if (this.isModified('used') && this.used) {
    this.status = 'used';
  }
  next();
});

// Export du type complet
export type ResetTokenDocument = ResetToken & Document & {
  createdAt: Date;
  updatedAt: Date;
};