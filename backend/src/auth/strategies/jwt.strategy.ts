import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    jti: string;
    tokenType: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private usersService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request) => {
                    const token = request?.cookies?.access_token || 
                                request?.headers?.authorization?.split(' ')[1];
                    if (!token) throw new UnauthorizedException('Token manquant');
                    return token;
                }
            ]),
            secretOrKey: process.env.JWT_SECRET,
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.usersService.findById(payload.sub);
        
        if (!user) throw new UnauthorizedException('Utilisateur non trouvé');
        if (!user.isActive) throw new UnauthorizedException('Compte utilisateur inactif');

        return {
            id: user._id,
            email: user.email,
            role: user.role,        
            isActive: user.isActive 
        };
    }
}