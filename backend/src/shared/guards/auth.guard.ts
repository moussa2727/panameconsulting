import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/users/users.service';
import { Request } from 'express';
import { User, UserRole } from '../../schemas/user.schema';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  // Ajoutez d'autres propriétés selon votre schéma User
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Vérification du token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      
      // Vérification de l'expiration
      if (payload.exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Token expired');
      }

      // Récupération de l'utilisateur
      const user = await this.usersService.findById(payload.sub);
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new ForbiddenException('Account is deactivated');
      }

      // Assignation propre de l'utilisateur à la requête
      request.user = {
        id: (user._id as any).toString(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        // Ajoutez d'autres propriétés nécessaires
      } as AuthenticatedUser;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}