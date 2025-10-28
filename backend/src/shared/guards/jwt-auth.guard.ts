import {
   Injectable,
   CanActivate,
   ExecutionContext,
   UnauthorizedException
 } from '@nestjs/common';
 import { JwtService } from '@nestjs/jwt';
 import { Request } from 'express';
 import { AuthGuard } from '@nestjs/passport';

 
 @Injectable()
 export class JwtAuthGuard  extends AuthGuard('jwt') implements CanActivate {
   constructor(private jwtService: JwtService) {
     super();
   }
 
   async canActivate(context: ExecutionContext): Promise<boolean> {
     const request = context.switchToHttp().getRequest();
     const token = this.extractTokenFromHeader(request);
     
     if (!token) {
       throw new UnauthorizedException('Token manquant');
     }
 
     try {
       const payload = await this.jwtService.verifyAsync(token, {
         secret: process.env.JWT_SECRET,
       });
       
       // Ajouter l'utilisateur à la requête
       request.user = payload;
     } catch {
       throw new UnauthorizedException('Token invalide ou expiré');
     }
     
     return true;
   }
 
   private extractTokenFromHeader(request: Request): string | undefined {
     const [type, token] = request.headers.authorization?.split(' ') ?? [];
     return type === 'Bearer' ? token : undefined;
   }
 }