// src/destinations/dto/create-destination.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateDestinationDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}