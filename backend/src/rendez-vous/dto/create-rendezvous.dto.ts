// create-rendezvous.dto.ts
import { 
    IsEmail, 
    IsNotEmpty, 
    IsOptional, 
    IsString,
    Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const TIME_SLOT_REGEX = /^(09|1[0-6]):(00|30)$/; // 09:00 à 16:30, par pas de 30 min
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/; // YYYY-MM-DD

export class CreateRendezvousDto {
    @ApiProperty({ example: 'Jean', description: 'Prénom du client' })
    @IsNotEmpty({ message: 'Le prénom est obligatoire' })
    @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
    firstName: string;

    @ApiProperty({ example: 'Dupont', description: 'Nom de famille du client' })
    @IsNotEmpty({ message: 'Le nom est obligatoire' })
    @IsString({ message: 'Le nom doit être une chaîne de caractères' })
    lastName: string;

    @ApiProperty({ example: 'jean.dupont@example.com', description: 'Email du client' })
    @IsNotEmpty({ message: 'L\'email est obligatoire' })
    @IsEmail({}, { message: 'Format d\'email invalide' })
    email: string;

    @ApiProperty({ example: '+33123456789', description: 'Téléphone du client' })
    @IsNotEmpty({ message: 'Le téléphone est obligatoire' })
    @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
    telephone: string;

    @ApiProperty({ 
        enum: ['Algérie', 'Turquie', 'Maroc', 'France', 'Tunisie', 'Chine', 'Russie', 'Autre'],
        example: 'France',
        description: 'Destination souhaitée' 
    })
    @IsNotEmpty({ message: 'La destination est obligatoire' })
    @IsString({ message: 'La destination doit être une chaîne de caractères' })
    destination: string;

    @ApiProperty({ 
        required: false,
        description: 'Autre destination (si "Autre" est sélectionné)' 
    })
    @IsOptional()
    @IsString({ message: 'La destination doit être une chaîne de caractères' })
    destinationAutre?: string;

    @ApiProperty({ 
        enum: ['Bac', 'Bac+1', 'Bac+2', 'Licence', 'Master I', 'Master II', 'Doctorat'],
        example: 'Licence',
        description: 'Niveau d\'étude du client' 
    })
    @IsNotEmpty({ message: 'Le niveau d\'étude est obligatoire' })
    @IsString({ message: 'Le niveau d\'étude doit être une chaîne de caractères' })
    niveauEtude: string;

    @ApiProperty({ 
        enum: ['Informatique', 'Médecine', 'Ingénierie', 'Droit', 'Commerce', 'Autre'],
        example: 'Informatique',
        description: 'Filière souhaitée' 
    })
    @IsNotEmpty({ message: 'La filière est obligatoire' })
    @IsString({ message: 'La filière doit être une chaîne de caractères' })
    filiere: string;

    @ApiProperty({ 
        required: false,
        description: 'Autre filière (si "Autre" est sélectionné)' 
    })
    @IsOptional()
    @IsString({ message: 'La filière doit être une chaîne de caractères' })
    filiereAutre?: string;

    @ApiProperty({ 
        example: '2024-12-25', 
        description: 'Date du rendez-vous (YYYY-MM-DD)' 
    })
    @IsNotEmpty({ message: 'La date est obligatoire' })
    @Matches(DATE_REGEX, { 
        message: 'Format de date invalide (YYYY-MM-DD requis)' 
    })
    date: string;

    @ApiProperty({ 
        example: '10:00',
        description: 'Heure du rendez-vous (HH:MM) entre 09:00 et 16:30 par pas de 30min' 
    })
    @IsNotEmpty({ message: 'L\'heure est obligatoire' })
    @Matches(TIME_SLOT_REGEX, {
        message: 'Créneau horaire invalide (09:00-16:30, par pas de 30min)'
    })
    time: string;
}