import { UsersService } from '@/users/users.service';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RevokedToken, RevokedTokenDocument } from '../schemas/revoked-token.schema';

@Injectable()
export class RevokedTokenService {
  constructor(
    @InjectModel(RevokedToken.name)
    private revokedTokenModel: Model<RevokedTokenDocument>,
    private jwtService: JwtService,
    private usersService: UsersService
  ) { }

  async revokeToken(token: string, expiresAt: Date): Promise<RevokedToken | null> {
    const decoded = this.jwtService.decode(token) as any;
    if (!decoded) {
      throw new Error('Invalid token');
    }

    const userId = decoded.sub || decoded.userId;
    if (!userId) {
      throw new Error('Token does not contain user ID');
    }

    // Vérifier si le token est déjà révoqué pour éviter le duplicate key
    const alreadyRevoked = await this.revokedTokenModel.findOne({ token });
    if (alreadyRevoked) {
      return null; // Ou retourner alreadyRevoked si besoin
    }

    const revokedToken = new this.revokedTokenModel({
      token,
      expiresAt,
      userId
    });

    return revokedToken.save();
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const found = await this.revokedTokenModel.findOne({ token }).exec();
    return !!found;
  }

 async revokeAllTokens(): Promise<{
   [x: string]: any;
   message: string;
   revokedCount: number;
 }> {
   const result = await this.revokedTokenModel.deleteMany({}).exec();
   return {
     message: `${result.deletedCount} tokens révoqués`,
     revokedCount: result.deletedCount
  };
}

  async cleanupExpiredTokens(): Promise<void> {
    await this.revokedTokenModel.deleteMany({
      expiresAt: { $lt: new Date() }
    }).exec();
  }

  async revokeTokensForUser(userId: string): Promise<void> {
    await this.revokedTokenModel.deleteMany({ userId }).exec();
  }
}