import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RevokedToken } from '../schemas/revoked-token.schema';

@Injectable()
export class RevokedTokenService {
    private readonly logger = new Logger(RevokedTokenService.name);

    constructor(
        @InjectModel(RevokedToken.name)
        private revokedTokenModel: Model<RevokedToken>,
        private jwtService: JwtService
    ) { }

    async revokeToken(token: string, expiresAt: Date): Promise<RevokedToken | null> {
        const decoded = this.jwtService.decode(token) as any;
        if (!decoded) {
            throw new Error('Token invalide');
        }

        const userId = decoded.sub || decoded.userId;
        if (!userId) {
            throw new Error('Token ne contient pas d\'ID utilisateur');
        }

        // Éviter les doublons
        const alreadyRevoked = await this.revokedTokenModel.findOne({ token });
        if (alreadyRevoked) {
            return null;
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
      [x: string]: any; message: string; revokedCount: number 
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