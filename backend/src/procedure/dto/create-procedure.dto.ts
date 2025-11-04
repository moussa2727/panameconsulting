import { 
    IsEmail, 
    IsEnum, 
    IsNotEmpty, 
    IsString, 
    IsMongoId,
    MinLength,
    MaxLength,
    IsOptional
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProcedureDto {
    @ApiProperty({ example: 'Jean', description: 'Prénom du client' })
    @IsString()
    @IsNotEmpty({ message: 'Le prénom est obligatoire' })
    @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
    @MaxLength(50, { message: 'Le prénom ne doit pas dépasser 50 caractères' })
    prenom: string;

    @ApiProperty({ example: 'Dupont', description: 'Nom du client' })
    @IsString()
    @IsNotEmpty({ message: 'Le nom est obligatoire' })
    @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
    @MaxLength(50, { message: 'Le nom ne doit pas dépasser 50 caractères' })
    nom: string;

    @ApiProperty({ example: 'jean.dupont@example.com', description: 'Email du client' })
    @IsEmail({}, { message: 'Format d\'email invalide' })
    @IsNotEmpty({ message: 'L\'email est obligatoire' })
    email: string;

    @ApiProperty({ 
        example: 'France', 
        description: 'Destination',
        enum: ['Algérie', 'Turquie', 'Maroc', 'France', 'Tunisie', 'Chine', 'Russie', 'Autre']
    })
    @IsEnum(['Algérie', 'Turquie', 'Maroc', 'France', 'Tunisie', 'Chine', 'Russie', 'Autre'], {
        message: 'Destination invalide'
    })
    @IsNotEmpty({ message: 'La destination est obligatoire' })
    destination: string;

    @ApiProperty({ description: 'ID du rendez-vous associé' })
    @IsMongoId({ message: 'ID de rendez-vous invalide' })
    @IsNotEmpty({ message: 'L\'ID du rendez-vous est obligatoire' })
    rendezVousId: string;
}

export class CancelProcedureDto {
    @ApiProperty({ 
        example: 'Changement de plans', 
        description: 'Raison de l\'annulation',
        required: false 
    })
    @IsOptional()
    @IsString({ message: 'La raison doit être une chaîne de caractères' })
    @MinLength(5, { message: 'La raison doit contenir au moins 5 caractères' })
    @MaxLength(500, { message: 'La raison ne doit pas dépasser 500 caractères' })
    reason?: string;
}