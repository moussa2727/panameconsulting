import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProcedureController } from './procedure.controller';
import { ProcedureService } from './procedure.service';
import { Procedure, ProcedureSchema } from '../schemas/procedure.schema';
import { RendezvousModule } from '../rendez-vous/rendez-vous.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '@/auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Procedure.name, schema: ProcedureSchema }
        ]),
        forwardRef(() => RendezvousModule),
        forwardRef(() => UsersModule),
        forwardRef(() => AuthModule),
        NotificationModule,
    ],
    controllers: [ProcedureController],
    providers: [ProcedureService],
    exports: [ProcedureService]
})
export class ProcedureModule {}