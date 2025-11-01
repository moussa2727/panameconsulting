import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDestinationDto {
    @ApiProperty({ example: 'France', description: 'Nom du pays' })
    @IsString()
    @IsNotEmpty({ message: 'Le pays est obligatoire' })
    @MinLength(2, { message: 'Le pays doit contenir au moins 2 caractères' })
    @MaxLength(100, { message: 'Le pays ne doit pas dépasser 100 caractères' })
    country: string;

    @ApiProperty({ 
        example: 'Description complète de la destination...', 
        description: 'Description de la destination' 
    })
    @IsString()
    @IsNotEmpty({ message: 'La description est obligatoire' })
    @MinLength(10, { message: 'La description doit contenir au moins 10 caractères' })
    @MaxLength(2000, { message: 'La description ne doit pas dépasser 2000 caractères' })
    text: string;
}