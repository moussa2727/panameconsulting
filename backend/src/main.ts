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

  // Rate limiting ajusté
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      message: 'Too many requests from this IP, please try again later.',
      skip: (req) => req.method === 'OPTIONS',
    }),
  );

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://panameconsulting.com'
    ],
    methods: ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', ' Cache-Control', 'X-Requested-With', 'X-HTTP-Method-Override'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
    exposedHeaders: ['set-cookie'],
    
  });

  // Fichiers statiques
  const uploadsDir = join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Dossier uploads créé: ${uploadsDir}`);
  }

  app.use('/uploads', (req: any, res: { header: (arg0: string, arg1: string) => void; }, next: () => void) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
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

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
    maxAge: '30d',
  });
  app.use((req: { path: string | string[]; headers: { authorization: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): any; new(): any; }; }; }, next: () => void) => {
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