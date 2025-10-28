import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StorageModule } from '../shared/storage/storage.module';
import { DestinationController } from './destination.controller';
import { DestinationService } from './destination.service';
import { Destination, DestinationSchema } from './entities/destination.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Destination.name, schema: DestinationSchema },
    ]),
    StorageModule,
  ],
  controllers: [DestinationController],
  providers: [DestinationService],
  exports: [DestinationService],
})
export class DestinationsModule { }