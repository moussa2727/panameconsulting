// rendezvous.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RendezvousDocument = Rendezvous & Document;

@Schema({ 
    timestamps: true, 
    collection: 'rendezvous',
    versionKey: 'version',
    optimisticConcurrency: true
})
export class Rendezvous {
    @Prop({ type: Number, default: 1 })
    version: number;

    @Prop({ required: true, trim: true, maxlength: 50 })
    firstName: string;

    @Prop({ required: true, trim: true, maxlength: 50 })
    lastName: string;

    @Prop({
        required: true,
        lowercase: true,
        trim: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    })
    email: string;

    @Prop({ required: true, trim: true })
    telephone: string;

    @Prop({
        required: true,
        enum: ['Algérie', 'Turquie', 'Maroc', 'France', 'Tunisie', 'Chine', 'Russie', 'Autre'],
        default: 'France'
    })
    destination: string;

    @Prop({ trim: true, maxlength: 100 })
    destinationAutre?: string;

    @Prop({
        required: true,
        enum: ['Bac', 'Bac+1', 'Bac+2', 'Licence', 'Master I', 'Master II', 'Doctorat']
    })
    niveauEtude: string;

    @Prop({
        required: true,
        enum: ['Informatique', 'Médecine', 'Ingénierie', 'Droit', 'Commerce', 'Autre']
    })
    filiere: string;

    @Prop({ trim: true, maxlength: 100 })
    filiereAutre?: string;

    @Prop({
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/
    })
    date: string;

   @Prop({
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
})
time: string;

    @Prop({
        required: true,
        enum: ['En attente', 'Confirmé', 'Terminé', 'Annulé'],
        default: 'En attente'
    })
    status: string;

    @Prop({
        enum: ['Favorable', 'Défavorable', null],
        default: null
    })
    avisAdmin?: string;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    userId?: Types.ObjectId;
  _id: any;
}

export const RendezvousSchema = SchemaFactory.createForClass(Rendezvous);

RendezvousSchema.pre('save', function(next: () => void) {
    this.increment();
    next();
});

RendezvousSchema.pre('save', function (next: () => void) {
    const selectedDate = new Date(this.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);

    if (selectedDateOnly < today) {
        throw new Error('La date doit être aujourd\'hui ou ultérieure');
    }

    // Si c'est aujourd'hui, vérifier l'heure actuelle
    if (selectedDateOnly.getTime() === today.getTime()) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [hours, minutes] = this.time.split(':').map(Number);
        const selectedTime = hours * 60 + minutes;

        if (selectedTime <= currentTime) {
            throw new Error('Vous ne pouvez pas réserver un créneau passé pour aujourd\'hui');
        }
    }

    const [hours, minutes] = this.time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const startTimeInMinutes = 9 * 60; // 9h00
    const endTimeInMinutes = 16 * 60 + 30; // 16h30

    if (timeInMinutes < startTimeInMinutes || timeInMinutes > endTimeInMinutes) {
        throw new Error('Les horaires disponibles sont entre 9h00 et 16h30');
    }

    // Vérifier que l'horaire est un multiple de 30 minutes depuis 9h00
    const timeSinceStart = timeInMinutes - startTimeInMinutes;
    if (timeSinceStart % 30 !== 0) {
        throw new Error('Les créneaux doivent être espacés de 30 minutes (9h00, 9h30, 10h00, etc.)');
    }

    // Si destination est "Autre", vérifier que destinationAutre est rempli
    if (this.destination === 'Autre' && (!this.destinationAutre || this.destinationAutre.trim() === '')) {
        throw new Error('Veuillez préciser votre destination');
    }

    // Si filière est "Autre", vérifier que filiereAutre est rempli
    if (this.filiere === 'Autre' && (!this.filiereAutre || this.filiereAutre.trim() === '')) {
        throw new Error('Veuillez préciser votre filière');
    }

    next();
});