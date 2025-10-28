export interface AuthConfig {
    jwtSecret: string;
    jwtExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    maxSessions: number;
  }
  
  export interface SecurityConfig {
    loginAttempts: number;
    blockDurationMinutes: number;
    passwordResetExpiry: number;
  }
  


  export const authConfig: AuthConfig = {
    jwtSecret: process.env.JWT_SECRET || 'e48d10d0f5d4db3cce7764d4ecb0a3d2d7343d08a8646b5724748edb2c16c3ea5444e85ce6344525db314ad8a085b44147beadf374567c28215392ab8ac241ff',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.REFRESH_SECRET || '4G+Nkuc6o+CqmDJFpMNkBMzKiKw6H7xDBusKJgWjyO8pMEERCxjeLfUNiyb9wXVbAjE7qu+eZUGUoYdLCLzNOg==',
    refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
    maxSessions: parseInt(process.env.MAX_SESSIONS || '10', 10) || 10,
  };
  