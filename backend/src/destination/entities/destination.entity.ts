import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Destination extends Document {
  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  imagePath: string;

  @Prop({ required: true })
  text: string;
}

export const DestinationSchema = SchemaFactory.createForClass(Destination);
