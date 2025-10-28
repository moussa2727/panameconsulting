import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { StepStatus } from '../../schemas/procedure.schema';

export class UpdateStepDto {
  @IsEnum(StepStatus)
  statut: StepStatus;

  @ValidateIf((o: { statut: StepStatus; }) => o.statut === StepStatus.REJECTED)
  @IsString()
  @IsNotEmpty()
  raisonRefus?: string;
}