import { IsBoolean, IsOptional, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CookieConsentDto {
  @ApiProperty({
    description: 'Consentement aux cookies',
    example: true
  })
  @IsBoolean()
  accepted: boolean;

  @ApiProperty({
    description: 'Timestamp de la décision',
    example: '2024-01-01T12:00:00.000Z',
    required: false
  })
  @IsOptional()
  @IsISO8601()
  timestamp?: string;
}