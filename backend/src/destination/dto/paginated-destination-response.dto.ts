import { ApiProperty } from '@nestjs/swagger';
import { Destination } from '../entities/destination.entity';

export class PaginatedDestinationResponse {
  @ApiProperty({ type: [Destination] })
  data: Destination[];

  @ApiProperty({
    example: {
      total: 50,
      page: 1,
      limit: 10,
      totalPages: 5
    }
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}