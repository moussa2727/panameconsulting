import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProcedureStepDto {
  @IsEnum(["Demande d'Admission", "Demande de Visa", "Préparatifs de Voyage"])
  nom: string;

  @IsEnum(['En cours', 'Refusé', 'Terminé'])
  statut: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  raisonRefus?: string;
}

export class CreateProcedureDto {
  @IsString()
  @IsNotEmpty()
  prenom: string;

  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsEmail()
  email: string;

  @IsEnum(['Algérie', 'Russie', 'Maroc', 'France', 'Chine'])
  destination: string;

  @ValidateNested({ each: true })
  @Type(() => CreateProcedureStepDto)
  steps: CreateProcedureStepDto[];

  @IsNotEmpty()
  rendezVousId: string;
}