import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RendezvousModule } from '../rendez-vous/rendez-vous.module';
import { ProcedureController } from './procedure.controller';
import { ProcedureService } from './procedure.service';
import { Procedure, ProcedureSchema } from '../schemas/procedure.schema';
import { Step, StepSchema } from '../schemas/step.schema';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '@/auth/auth.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Procedure.name, schema: ProcedureSchema },
      { name: Step.name, schema: StepSchema }
    ]),
    forwardRef(() => RendezvousModule),
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [ProcedureController],
  providers: [ProcedureService],
  exports: [ProcedureService]
})
export class ProcedureModule {}