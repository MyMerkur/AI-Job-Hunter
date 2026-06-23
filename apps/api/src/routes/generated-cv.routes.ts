import { generateCvPdf } from '@ai-job-hunter/cv';
import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { GeneratedCVModel } from '../models/generated-cv.model.js';

function requiredId(value: string): string {
  if (!mongoose.isValidObjectId(value)) throw new HttpError(400, 'Geçersiz generated CV kimliği.');
  return value;
}

async function loadGeneratedCv(id: string) {
  const generatedCv = await GeneratedCVModel.findById(requiredId(id));
  if (!generatedCv) throw new HttpError(404, 'Generated CV bulunamadı.');
  return generatedCv;
}

export const generatedCvRouter: ExpressRouter = Router();

generatedCvRouter.post('/:id/export-pdf', async (request, response) => {
  const generatedCv = await loadGeneratedCv(request.params.id);
  const pdfPath = await generateCvPdf({ tailoredCvMarkdown: generatedCv.content, outputDirectory: env.generatedCvDirectory, fileName: `generated-cv-${generatedCv._id.toString()}.pdf` });
  generatedCv.pdfPath = pdfPath;
  await generatedCv.save();
  response.json({ generatedCv, pdfDownloadUrl: `/api/generated-cv/${generatedCv._id.toString()}/download/pdf` });
});

generatedCvRouter.get('/:id/download/markdown', async (request, response) => {
  const generatedCv = await loadGeneratedCv(request.params.id);
  response.type('text/markdown').attachment(`generated-cv-${generatedCv._id.toString()}.md`).send(generatedCv.content);
});

generatedCvRouter.get('/:id/download/pdf', async (request, response) => {
  const generatedCv = await loadGeneratedCv(request.params.id);
  if (!generatedCv.pdfPath) throw new HttpError(404, 'Bu CV için henüz PDF oluşturulmadı.');
  try { await access(generatedCv.pdfPath, constants.R_OK); }
  catch { throw new HttpError(404, 'Kaydedilmiş PDF dosyası bulunamadı. PDF’i yeniden oluşturun.'); }
  response.download(generatedCv.pdfPath, `generated-cv-${generatedCv._id.toString()}.pdf`);
});
