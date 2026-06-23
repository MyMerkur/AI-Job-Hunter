import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import PDFDocument from 'pdfkit';

export interface GenerateCvPdfInput {
  tailoredCvMarkdown: string;
  outputDirectory: string;
  fileName: string;
}

function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
}

function markdownLine(line: string): { kind: 'title' | 'heading' | 'bullet' | 'text' | 'space'; text: string } {
  const clean = cleanText(line);
  if (!clean) return { kind: 'space', text: '' };
  if (clean.startsWith('# ')) return { kind: 'title', text: clean.replace(/^#\s+/, '') };
  if (clean.startsWith('## ')) return { kind: 'heading', text: clean.replace(/^##\s+/, '') };
  if (/^[-*]\s+/.test(clean)) return { kind: 'bullet', text: clean.replace(/^[-*]\s+/, '') };
  return { kind: 'text', text: clean.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1') };
}

/** Renders only the supplied Markdown content; it never enriches or alters CV facts. */
export async function generateCvPdf(input: GenerateCvPdfInput): Promise<string> {
  if (!input.tailoredCvMarkdown.trim()) throw new Error('PDF oluşturmak için CV markdown içeriği gerekli.');
  const outputPath = join(input.outputDirectory, input.fileName);
  await mkdir(dirname(outputPath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margins: { top: 56, right: 54, bottom: 56, left: 54 }, info: { Title: 'Tailored CV' } });
    const stream = document.pipe(createWriteStream(outputPath));
    stream.on('finish', resolve); stream.on('error', reject); document.on('error', reject);

    for (const line of input.tailoredCvMarkdown.split(/\r?\n/).map(markdownLine)) {
      if (line.kind === 'space') { document.moveDown(0.35); continue; }
      if (line.kind === 'title') { document.font('Helvetica-Bold').fontSize(18).fillColor('#172033').text(line.text); document.moveDown(0.45); continue; }
      if (line.kind === 'heading') { document.moveDown(0.45).font('Helvetica-Bold').fontSize(12).fillColor('#172033').text(line.text); document.moveDown(0.2); continue; }
      document.font('Helvetica').fontSize(10.5).fillColor('#1f2937');
      if (line.kind === 'bullet') document.text(line.text, { indent: 13, bulletRadius: 1.5, bulletIndent: 2, lineGap: 2 });
      else document.text(line.text, { lineGap: 2 });
    }
    document.end();
  });
  return outputPath;
}
