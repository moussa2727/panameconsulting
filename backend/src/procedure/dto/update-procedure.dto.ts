import { PartialType } from '@nestjs/swagger';
import { CreateProcedureDto } from './create-procedure.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ProcedureStatus } from '../../schemas/procedure.schema';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProcedureDto extends PartialType(CreateProcedureDto) {
    @ApiProperty({ 
        example: 'Terminée', 
        description: 'Statut de la procédure',
        enum: ProcedureStatus,
        required: false
    })
    @IsOptional()
    @IsEnum(ProcedureStatus, { message: 'Statut invalide' })
    statut?: ProcedureStatus;
}