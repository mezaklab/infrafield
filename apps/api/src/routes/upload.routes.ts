import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const uploadRouter = Router();

// Ensure storage/uploads folder exists
const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage setup with secure Random UUID/Timestamp filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueId = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString();
    const safeName = `${Date.now()}-${uniqueId}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit to accommodate video/image prints
  fileFilter: (_req, _file, cb) => {
    // Allow images, videos, text, pdfs, logs, etc.
    cb(null, true);
  },
});

// POST /api/upload - File/Photo attachment upload
uploadRouter.post('/', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.status(201).json({
      url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao salvar upload de arquivo.' });
  }
});
