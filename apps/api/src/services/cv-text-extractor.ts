import { readFile } from 'node:fs/promises';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { HttpError } from '../lib/http-error.js';

export type CvFileType = 'pdf' | 'docx';

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new HttpError(422, `CV metin çıkarma işlemi ${Math.round(timeoutMs / 1000)} saniye içinde tamamlanmadı.`)), timeoutMs);
  });
  return Promise.race([operation, timeoutPromise]).finally(() => { if (timeout) clearTimeout(timeout); });
}

export async function validateFileSignature(filePath: string, fileType: CvFileType): Promise<void> {
  const header = await readFile(filePath, { encoding: null }).then((content) => content.subarray(0, 5));
  const isPdf = header.toString('ascii').startsWith('%PDF-');
  const isZip = header[0] === 0x50 && header[1] === 0x4b;
  if ((fileType === 'pdf' && !isPdf) || (fileType === 'docx' && !isZip)) {
    throw new HttpError(400, 'Dosya içeriği seçilen dosya türüyle eşleşmiyor.');
  }
}

export async function extractCvText(filePath: string, fileType: CvFileType, timeoutMs: number): Promise<string> {
  if (fileType === 'pdf') {
    const buffer = await readFile(filePath);
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await withTimeout(parser.getText(), timeoutMs);
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  const result = await withTimeout(mammoth.extractRawText({ path: filePath }), timeoutMs);
  return result.value.trim();
}
