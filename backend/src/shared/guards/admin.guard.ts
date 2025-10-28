import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../schemas/user.schema';
import { Request } from 'express';

interface AuthenticatedUser {
  role: UserRole;
  // Ajoutez d'autres propriétés si nécessaire
  id: string;
  email: string;
  isActive: boolean;
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Vérification spécifique pour les administrateurs
    if (user.role !== UserRole.ADMIN || !user.isActive) {
      throw new ForbiddenException('Administrator access required');
    }

    return true;
  }
}