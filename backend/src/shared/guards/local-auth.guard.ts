import { ExecutionContext, Injectable, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
 
   // * Fonctionnement :
   // * 1. Le guard intercepte la requête
   // * 2. Passe les credentials (email, password) à la stratégie LocalStrategy
   // * 3. La stratégie valide les credentials via le AuthService
   // * 4. Si valide, ajoute l'utilisateur à la requête (req.user)
   // * 5. Si invalide, renvoie une erreur 401 Unauthorized
   

   @UseGuards(LocalAuthGuard)
   @Post('login')
   async login(@Req() req: any) {
      return req.user; // Utilisateur authentifié
   }
  constructor() {
    super();
  }

  /**
   * Vous pouvez surcharger ces méthodes si besoin :
   */
  
  handleRequest(err: any, user: any, info: any, context: any, status: any) {
    // Personnalisez la réponse en cas d'erreur
    if (err || !user) {
      throw err || new UnauthorizedException('Identifiants invalides');
    }
    return user;
  }

//   canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
//     // Ajoutez ici une logique supplémentaire avant l'authentification
//     return super.canActivate(context);
//   }
}