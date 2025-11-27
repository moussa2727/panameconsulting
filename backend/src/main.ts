import { INestApplicationContext, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  NestExpressApplication,
  ExpressAdapter,
} from "@nestjs/platform-express";
import { useContainer as classValidatorUseContainer } from "class-validator";
import express from "express";
import * as fs from "fs";
import helmet from "helmet";
import { join } from "path";
import { AppModule } from "./app.module";

function useContainer(
  appContext: INestApplicationContext,
  options: { fallbackOnErrors: boolean },
) {
  classValidatorUseContainer(appContext, options);
}

async function bootstrap() {
  // 👇 Création du serveur Express natif
  const server = express();

  server.get("/health", (_req, res) => {
    const health = {
      status: "OK",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
      uptime: `${Math.floor(process.uptime())}s`,
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
      node: process.version,
    };

    res.status(200).json(health);
  });

  // ➕ Route spéciale pour /
  server.get("/", (_req, res) => {
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
          defaultSrc: ["'self'", "https://www.google.com"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://maps.googleapis.com",
            "https://www.google.com",
            "https://maps.gstatic.com",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://www.google.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: [
            "'self'",
            "data:",
            "https://maps.gstatic.com",
            "https://maps.googleapis.com",
            "https://www.google.com",
          ],
          connectSrc: [
            "'self'",
            "http://localhost:3000",
            "https://maps.googleapis.com",
          ],
          frameSrc: ["https://www.google.com"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      referrerPolicy: { policy: "no-referrer" },
      frameguard: false,
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  app.use(
    (
      _req: any,
      res: {
        removeHeader: (arg0: string) => void;
        header: (arg0: string, arg1: string) => void;
      },
      next: () => void,
    ) => {
      res.removeHeader("X-Powered-By");
      res.header("X-Content-Type-Options", "nosniff");
      next();
    },
  );

  // Configuration CORS
 app.enableCors({
  origin: [
    "http://localhost:5173",
    "http://localhost:10000",
    "https://panameconsulting.com", 
    "https://www.panameconsulting.com",
    "https://panameconsulting.vercel.app",
    'https://panameconsulting.onrender.com'

  ],
  methods: ["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Accept", 
    "Authorization",
    "Cache-Control",
    "X-Requested-With",
    "X-HTTP-Method-Override",
  ],
  credentials: true, // ← ESSENTIEL pour les cookies
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });

  // Création du dossier uploads uniquement pour les images
  const uploadsDir = join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Dossier uploads créé: ${uploadsDir}`);
  }

  // Configuration des fichiers statiques uniquement pour le dossier uploads
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      maxAge: "30d",
      setHeaders: (
        res: { set: (arg0: string, arg1: string) => void },
        path: string,
      ) => {
        // Définition des types MIME uniquement pour les images
        if (
          path.endsWith(".jpg") ||
          path.endsWith(".jpeg") ||
          path.endsWith(".png") ||
          path.endsWith(".webp") ||
          path.endsWith(".gif") ||
          path.endsWith(".svg")
        ) {
          if (path.endsWith(".png")) {
            res.set("Content-Type", "image/png");
          } else if (path.endsWith(".webp")) {
            res.set("Content-Type", "image/webp");
          } else if (path.endsWith(".gif")) {
            res.set("Content-Type", "image/gif");
          } else if (path.endsWith(".svg")) {
            res.set("Content-Type", "image/svg+xml");
          } else {
            res.set("Content-Type", "image/jpeg");
          }
        }
      },
    }),
  );

  // Middleware d'autorisation pour les statistiques
  app.use((req: any, res: any, next: () => void) => {
    // Allow CORS preflight to pass without Authorization
    if (req.method === 'OPTIONS') {
      return next();
    }
    if (req.path.includes('/stats') && !req.headers.authorization) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  });

  // Préfixe global API
  app.setGlobalPrefix("api");

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 10000;
  await app.listen(port);
  console.log(`Database connected successfully`);
  console.log(`Server running on port ${port}`);
}

bootstrap();