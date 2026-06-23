import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { CVProfileModel } from '../models/cv-profile.model.js';
import { extractCvText, type CvFileType, validateFileSignature } from '../services/cv-text-extractor.js';

mkdirSync(env.cvUploadDirectory, { recursive: true });

const acceptedMimeTypes: Record<CvFileType, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function getFileType(file: Express.Multer.File): CvFileType | undefined {
  const extension = extname(file.originalname).toLowerCase();
  if (extension === '.pdf' && file.mimetype === acceptedMimeTypes.pdf) return 'pdf';
  if (extension === '.docx' && file.mimetype === acceptedMimeTypes.docx) return 'docx';
  return undefined;
}

function sanitizeFilename(filename: string): string {
  const safeBaseName = basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  return safeBaseName.slice(0, 160) || 'cv';
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, env.cvUploadDirectory),
    filename: (_request, file, callback) => callback(null, `${randomUUID()}-${sanitizeFilename(file.originalname)}`),
  }),
  limits: { fileSize: env.cvUploadMaxBytes, files: 1 },
  fileFilter: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    const valid = (extension === '.pdf' && file.mimetype === acceptedMimeTypes.pdf)
      || (extension === '.docx' && file.mimetype === acceptedMimeTypes.docx);
    if (valid) callback(null, true);
    else callback(new HttpError(400, 'Yalnızca PDF ve DOCX dosyaları yüklenebilir.'));
  },
});

export const cvRouter: ExpressRouter = Router();

cvRouter.post('/upload', upload.single('file'), async (request, response) => {
  if (!request.file) throw new HttpError(400, 'CV dosyası zorunludur. Form alanı adı "file" olmalıdır.');

  const fileType = getFileType(request.file);
  if (!fileType) {
    await unlink(request.file.path).catch(() => undefined);
    throw new HttpError(400, 'Yalnızca PDF ve DOCX dosyaları yüklenebilir.');
  }

  try {
    await validateFileSignature(request.file.path, fileType);
    const rawText = await extractCvText(request.file.path, fileType);
    const profile = await CVProfileModel.create({
      name: request.body.name?.trim() || request.file.originalname.replace(/\.[^.]+$/, ''),
      rawText,
      sourceFileName: sanitizeFilename(request.file.originalname),
      skills: [],
      status: 'draft',
    });
    response.status(201).json({ profile });
  } catch (error) {
    await unlink(request.file.path).catch(() => undefined);
    throw error;
  }
});

cvRouter.get('/', async (_request, response) => {
  const profiles = await CVProfileModel.find().sort({ createdAt: -1 });
  response.json({ profiles });
});

cvRouter.get('/:id', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Geçersiz CV profil kimliği.');
  const profile = await CVProfileModel.findById(request.params.id);
  if (!profile) throw new HttpError(404, 'CV profili bulunamadı.');
  response.json({ profile });
});
