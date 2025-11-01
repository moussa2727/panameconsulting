import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from './auth.service';

@Injectable()
export class CleanupService {
    private readonly logger = new Logger(CleanupService.name);

    constructor(private readonly authService: AuthService) {}

    @Cron(CronExpression.EVERY_HOUR)
    async handleCleanupExpiredSessions() {
        try {
            this.logger.log('Début du nettoyage automatique des sessions expirées');
            await this.authService.cleanupExpiredSessions();
            this.logger.log('Nettoyage automatique des sessions terminé');
        } catch (error) {
            this.logger.error('Erreur lors du nettoyage automatique:', error);
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async handleDailyCleanup() {
        try {
            this.logger.log('Début du nettoyage quotidien');
            await this.authService.cleanupExpiredSessions();
            this.logger.log('Nettoyage quotidien terminé');
        } catch (error) {
            this.logger.error('Erreur lors du nettoyage quotidien:', error);
        }
    }
}