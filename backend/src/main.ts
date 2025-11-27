import { INestApplicationContext, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication, ExpressAdapter } from '@nestjs/platform-express';
import { useContainer as classValidatorUseContainer } from 'class-validator';
import express = require('express');
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

function useContainer(appContext: INestApplicationContext, options: { fallbackOnErrors: boolean }) {
  classValidatorUseContainer(appContext, options);
}

async function bootstrap() {
  // 👇 Création du serveur Express natif
  const server = express();

  // ➕ Route spéciale pour /
  server.get('/', (req, res) => {
    res.status(200).send(`
      <h1>Bienvenue sur le site Paname Consulting</h1>
      <p>L'API est disponible sur <a href="/api">/api</a></p>
    `);
  });

  // 👇 Création de l'application Nest avec adaptateur Express personnalisé
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );

  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.use(cookieParser());

  // Sécurité HTTP avec Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'", 'https://www.google.com'],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://maps.googleapis.com',
            'https://www.google.com',
            'https://maps.gstatic.com'
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
            'https://www.google.com'
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: [
            "'self'",
            'data:',
            'https://maps.gstatic.com',
            'https://maps.googleapis.com',
            'https://www.google.com'
          ],
          connectSrc: [
            "'self'",
            'http://localhost:3000',
            'https://maps.googleapis.com'
          ],
          frameSrc: ['https://www.google.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    })
  );

  app.use((req: any, res: { removeHeader: (arg0: string) => void; header: (arg0: string, arg1: string) => void; }, next: () => void) => {
    res.removeHeader('X-Powered-By');
    res.header('X-Content-Type-Options', 'nosniff');
    next();
  });

  // CORS (MUST come before rate limiting)
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://panameconsulting.com',
    'https://www.panameconsulting.com',
    'https://panameconsulting.vercel.app',
    'https://www.panameconsulting.vercel.app',
  ];
  const netlifyPreviewRegex = /^https?:\/\/([a-z0-9-]+--)?panameconsulting\.netlify\.app$/i;
  const localhostRegex = /^http:\/\/localhost:\d+$/i;
  const isAllowedOrigin = (o: string) =>
    allowedOrigins.includes(o) || netlifyPreviewRegex.test(o) || localhostRegex.test(o);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'X-Requested-With', 'X-HTTP-Method-Override'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
    exposedHeaders: ['set-cookie'],
  });

  // Rate limiting (AFTER CORS with handler that mirrors CORS headers)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'production' ? 500 : 1000,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        if (req.method === 'OPTIONS') return true;
        // Skip rate limiting for auth endpoints in development
        if (process.env.NODE_ENV !== 'production' && 
            (req.path === '/api/auth/login' || req.path === '/api/auth/register')) {
          return true;
        }
        return false;
      },
      handler: (req: any, res: any) => {
        // Mirror CORS headers on 429 responses
        const origin = req.headers.origin as string | undefined;
        if (origin && isAllowedOrigin(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        res.status(429).json({ message: 'Too many requests from this IP, please try again later.' });
      },
    }),
  );

  // Fichiers statiques
  const uploadsDir = join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Dossier uploads créé: ${uploadsDir}`);
  }

  app.use('/uploads', (req: any, res: any, next: () => void) => {
    const origin = req.headers.origin as string | undefined;
    if (origin && isAllowedOrigin(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  app.use('/uploads', express.static(uploadsDir, {
    maxAge: '30d',
    setHeaders: (res: { set: (arg0: string, arg1: string) => void; }, path: string) => {
      if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.webp')) {
        res.set('Content-Type', 'image/jpeg');
      }
    }
  }));


  app.use((req: { path: string | string[]; headers: { authorization: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): any; new(): any; }; }; }, next: () => void) => {
  // Allow CORS preflight to pass without Authorization
  // so browsers can complete OPTIONS before sending actual request
  // and avoid false 401 causing CORS errors.
  if ((req as any).method === 'OPTIONS') {
    return next();
  }
  if (req.path.includes('/stats') && !req.headers.authorization) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
});

  // Préfixe global API
  app.setGlobalPrefix('api');

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  await app.listen(3000);
  console.log(`Database connected successfully`);
  console.log(`Server running on http://localhost:3000`);
}

bootstrap();