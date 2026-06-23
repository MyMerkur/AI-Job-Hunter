import { existsSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { WorkerApplicationLogModel } from '../models/application-log.model.js';
import { WorkerApplicationModel } from '../models/application.model.js';
import { WorkerCVProfileModel } from '../models/cv-profile.model.js';
import { WorkerGeneratedCVModel } from '../models/generated-cv.model.js';
import { WorkerJobModel } from '../models/job.model.js';

type Contact = { name?: string; email?: string; phone?: string };

async function log(applicationId: mongoose.Types.ObjectId, action: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
  await WorkerApplicationLogModel.create({ applicationId, action, message, metadata });
}

function extractContact(profileName: string, rawText: string): Contact {
  const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = rawText.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/)?.[0]?.trim();
  return { name: profileName || undefined, email, phone };
}

async function fillFirst(page: Page, selectors: string[], value: string | undefined, label: string, applicationId: mongoose.Types.ObjectId): Promise<void> {
  if (!value) return;
  for (const selector of selectors) {
    const field = page.locator(selector).first();
    if (await field.count() === 0) continue;
    if (!await field.isVisible().catch(() => false)) continue;
    await field.fill(value);
    await log(applicationId, 'field_filled', `${label} alanı dolduruldu.`, { field: label });
    return;
  }
}

function isChallenge(text: string): boolean { return /captcha|verify you are human|checking your browser|cloudflare/i.test(text); }

async function findApplyButton(page: Page) {
  const button = page.locator('a, button').filter({ hasText: /apply|application|přihlásit|odpovědět|reagovat/i }).first();
  return await button.count() > 0 && await button.isVisible().catch(() => false) ? button : undefined;
}

/** Fills a public form but deliberately never clicks any submit/send button. */
export async function assistApplication(applicationId: string): Promise<void> {
  if (!mongoose.isValidObjectId(applicationId)) throw new Error('Application ID must be a valid MongoDB ObjectId.');
  const application = await WorkerApplicationModel.findById(applicationId);
  if (!application) throw new Error('Application not found.');
  const [job, profile, generatedCv] = await Promise.all([
    WorkerJobModel.findById(application.jobId), WorkerCVProfileModel.findById(application.cvProfileId),
    application.generatedCvId ? WorkerGeneratedCVModel.findById(application.generatedCvId) : null,
  ]);
  if (!job || !profile) throw new Error('Application job or CV profile not found.');

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: env.applicationAssistantHeadless });
    const context = await browser.newContext();
    let page = await context.newPage();
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await log(application._id, 'page_opened', 'İlan sayfası açıldı.', { url: job.url });
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (isChallenge(bodyText)) throw new Error('Challenge/CAPTCHA page detected; stopping without bypassing it.');

    const applyButton = await findApplyButton(page);
    if (!applyButton) {
      await log(application._id, 'apply_button_not_found', 'Başvuru düğmesi bulunamadı; sayfa manuel inceleme için açık bırakıldı.');
    } else {
      await log(application._id, 'apply_button_found', 'Başvuru düğmesi bulundu ve formu açmak için tıklandı.');
      const popup = page.waitForEvent('popup', { timeout: 3_000 }).catch(() => undefined);
      await applyButton.click({ timeout: 10_000 });
      const popupPage = await popup;
      if (popupPage) page = popupPage;
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      await page.waitForTimeout(800);
      const formText = await page.locator('body').innerText().catch(() => '');
      if (isChallenge(formText)) throw new Error('Challenge/CAPTCHA page detected after opening the form; stopping without bypassing it.');
    }

    const contact = extractContact(profile.name, profile.rawText ?? '');
    await fillFirst(page, ['input[name*="name" i]', 'input[id*="name" i]', 'input[autocomplete="name"]'], contact.name, 'name', application._id);
    await fillFirst(page, ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]'], contact.email, 'email', application._id);
    await fillFirst(page, ['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]'], contact.phone, 'phone', application._id);
    await fillFirst(page, ['textarea[name*="cover" i]', 'textarea[name*="letter" i]', 'textarea[name*="motivation" i]', 'textarea'], generatedCv?.coverLetterContent, 'cover_letter', application._id);

    const cvFilePath = generatedCv?.pdfPath ?? generatedCv?.filePath;
    if (cvFilePath && existsSync(cvFilePath)) {
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.count() > 0 && await fileInput.isVisible().catch(() => true)) {
        await fileInput.setInputFiles(cvFilePath);
        await log(application._id, 'file_uploaded', 'Oluşturulan CV PDF dosyası forma yüklendi.', { filePath: cvFilePath });
      }
    } else {
      await log(application._id, 'file_upload_skipped', 'Yüklenecek oluşturulmuş CV dosyası bulunamadı; markdown taslağı dosya yerine kullanılamaz.');
    }

    await log(application._id, 'stopped_before_submit', 'Form doldurma yardımı tamamlandı. Submit düğmesine tıklanmadı.');
    console.log('Review the form manually. The bot will not submit.');
    if (env.applicationAssistantHeadless) {
      await context.close();
      await browser.close();
      return;
    }
    await new Promise<void>((resolve) => browser?.once('disconnected', () => resolve()));
  } catch (error) {
    await log(application._id, 'error', 'Başvuru asistanı hata nedeniyle durdu.', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    if (env.applicationAssistantHeadless && browser?.isConnected()) await browser.close();
  }
}
