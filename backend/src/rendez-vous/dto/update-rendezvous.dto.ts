import { PartialType } from '@nestjs/swagger';
import { CreateRendezvousDto } from './create-rendezvous.dto';
import { 
  IsOptional, 
  IsEnum,
  IsString,
  Matches
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRendezvousDto extends PartialType(CreateRendezvousDto) {
  @ApiProperty({
    enum: ['En attente', 'Confirmé', 'Terminé', 'Annulé'],
    example: 'Confirmé',
    description: 'Nouveau statut du rendez-vous',
    required: false
  })
  @IsOptional()
  @IsEnum(['En attente', 'Confirmé', 'Terminé', 'Annulé'], {
    message: 'Statut invalide'
  })
  status?: string;

  @ApiProperty({
    enum: ['Favorable', 'Défavorable'],
    example: 'Favorable',
    description: 'Avis administratif',
    required: false
  })
  @IsOptional()
  @IsEnum(['Favorable', 'Défavorable'], {
    message: 'Avis administratif invalide'
  })
  avisAdmin?: string;

  @ApiProperty({
    required: false,
    example: 'Le client a fourni tous les documents nécessaires',
    description: 'Commentaire administratif'
  })
  @IsOptional()
  @IsString({ message: 'Le commentaire doit être une chaîne de caractères' })
  @Matches(/^[a-zA-Z0-9À-ÿ .,!?-]{0,1000}$/, {
    message: 'Le commentaire ne doit pas dépasser 1000 caractères'
  })
  adminComment?: string;
}