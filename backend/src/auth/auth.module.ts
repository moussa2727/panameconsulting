import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { ResetToken, ResetTokenSchema } from '../schemas/reset-token.schema';
import { RefreshToken, RefreshTokenSchema } from '../schemas/refresh-token.schema';
import { RevokedToken, RevokedTokenSchema } from '../schemas/revoked-token.schema';
import { Session, SessionSchema } from '../schemas/session.schema';
import { ThrottleGuard } from '../shared/guards/throttle.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CleanupService } from './cleanup.service';
import { RefreshTokenService } from './refresh-token.service';
import { RevokedTokenService } from './revoked-token.service';
import { SessionService } from './session.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { AuthGuard } from '../shared/guards/auth.guard';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MailModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: RevokedToken.name, schema: RevokedTokenSchema },
      { name: Session.name, schema: SessionSchema },
      { name: ResetToken.name, schema: ResetTokenSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') , // Ajout d'une valeur par défaut
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '1h'), // Utilisation correcte de la variable
          issuer: configService.get('APP_NAME', 'api-panameconsulting'), // Valeur par défaut
          algorithm: 'HS256',
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [
    RevokedTokenService,
    RefreshTokenService,
    AuthService,
    SessionService,
    CleanupService,
    LocalStrategy,
    JwtStrategy,
    ThrottleGuard,
    AuthGuard,
    {
      provide: 'AUTH_CONFIG',
      useFactory: (configService: ConfigService) => ({
        maxLoginAttempts: parseInt(configService.get('MAX_LOGIN_ATTEMPTS', '5')),
        loginAttemptsTTL: parseInt(configService.get('LOGIN_ATTEMPTS_TTL', '900000')), // 15 minutes en ms
        jwtExpiration: configService.get('JWT_EXPIRES_IN', '1h'),
      }),
      inject: [ConfigService],
    }
  ],
  exports: [
    AuthService, 
    RevokedTokenService, 
    RefreshTokenService,
    SessionService, 
    ThrottleGuard,
    AuthGuard,
    JwtModule,
  ],
})
export class AuthModule {}