import { PartialType } from '@nestjs/mapped-types';
import { CreateProcedureDto } from './create-procedure.dto';
import { IsOptional, IsEnum } from 'class-validator';

export class UpdateProcedureDto extends PartialType(CreateProcedureDto) {
  @IsOptional()
  @IsEnum(['En cours', 'Refusée', 'Annulée', 'Terminée'])
  statut?: string;
}