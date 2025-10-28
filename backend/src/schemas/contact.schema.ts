import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Contact extends Document {
  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  adminResponse?: string;

  @Prop()
  respondedAt?: Date;

}

export const ContactSchema = SchemaFactory.createForClass(Contact);
export type ContactDocument = Contact & Document;