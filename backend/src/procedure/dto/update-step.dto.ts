import { IsEnum, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StepStatus } from '../../schemas/procedure.schema';

export class UpdateStepDto {
    @ApiProperty({ 
        example: 'Terminé', 
        description: 'Statut de l\'étape',
        enum: StepStatus
    })
    @IsEnum(StepStatus, { message: 'Statut d\'étape invalide' })
    statut: StepStatus;

    @ApiProperty({ 
        example: 'Documents incomplets', 
        description: 'Raison du refus (si applicable)',
        required: false
    })
    @IsOptional()
    @IsString({ message: 'La raison doit être une chaîne de caractères' })
    @MinLength(5, { message: 'La raison doit contenir au moins 5 caractères' })
    @MaxLength(500, { message: 'La raison ne doit pas dépasser 500 caractères' })
    raisonRefus?: string;
}