// jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { Types } from 'mongoose';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          const token = request?.cookies?.access_token || 
                       request?.headers?.authorization?.split(' ')[1];
          if (!token) throw new UnauthorizedException('Token missing');
          return token;
        }
      ]),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.isActive) throw new UnauthorizedException('User account is inactive');

    // Retournez les champs attendus par votre AdminGuard
    return {
      id: (user._id as Types.ObjectId).toString(),
      email: user.email,
      role: user.role,        
      isActive: user.isActive 
    };
  }
}