import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProcedureService } from './procedure.service';
import { ProcedureController } from './procedure.controller';
import { Procedure, ProcedureSchema } from '../schemas/procedure.schema';
import { NotificationService } from '../notification/notification.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Procedure.name, schema: ProcedureSchema }]),
  ],
  controllers: [ProcedureController],
  providers: [ProcedureService, NotificationService],
  exports: [ProcedureService],
})
export class ProcedureModule {}