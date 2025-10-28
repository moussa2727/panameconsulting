import { diskStorage } from "multer";
import * as fs from 'fs';
import * as path from 'path';

// Vérifier et créer le dossier uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (req: any, file: { originalname: string; }, cb: (arg0: Error | null, arg1: boolean) => void) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.webp', '.png', '.jpg', '.jpeg', '.avif'];
    
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non supporté: ${ext}`), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
};