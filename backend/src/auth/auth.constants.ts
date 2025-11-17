// src/auth/auth.constants.ts
export const AuthConstants = {
  // JWT Configuration
  JWT_EXPIRATION: '15m',
  REFRESH_TOKEN_EXPIRATION: '7d',
  
  // Token Configuration
  RESET_TOKEN_EXPIRATION_MS: 3600000, // 1 heure
  MAX_SESSION_DURATION_MS: 7 * 24 * 60 * 60 * 1000, // 7 jours
  
  // Security Configuration
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_ATTEMPTS_TTL_MINUTES: 30,
  MIN_PASSWORD_LENGTH: 8,
  BCRYPT_SALT_ROUNDS: 12,
  
  // Cleanup Intervals
  TOKEN_BLACKLIST_CLEANUP_INTERVAL: 3600000, // 1 heure
  SESSION_CLEANUP_INTERVAL: 1800000, // 30 minutes
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100
} as const;