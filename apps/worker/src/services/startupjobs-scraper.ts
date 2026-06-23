import { chromium, type Page } from 'playwright';
import { env } from '../config/env.js';
import { WorkerJobModel, type WorkerJobHydratedDocument } from '../models/job.model.js';

const searchTerms = ['React', 'Node.js', 'JavaScript', 'TypeScript', 'Full Stack', 'Junior Developer', 'Internship Developer'];
const source = 'startupjobs.cz';

type ScrapedJob = {
  title: string;
  company: string;
  location?: string;
  url: string;
  description: string;
  salary?: { text: string };
  remoteType: 'remote' | 'hybrid' | 'onsite' | 'unknown';
};

const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function normaliseText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function searchUrl(term: string): string {
  const url = new URL('/', env.startupJobsBaseUrl);
  url.searchParams.set(env.startupJobsSearchParam, term);
  return url.toString();
}

function isCaptchaOrChallenge(text: string): boolean {
  return /captcha|verify you are human|checking your browser|cloudflare/i.test(text);
}

function inferRemoteType(text: string): ScrapedJob['remoteType'] {
  const value = text.toLowerCase();
  if (/\bremote\b|na dálku|z domova/.test(value)) return 'remote';
  if (/\bhybrid\b|hybridní/.test(value)) return 'hybrid';
  if (/on-site|onsite|na místě/.test(value)) return 'onsite';
  return 'unknown';
}

function inferSalary(text: string): { text: string } | undefined {
  const match = text.match(/(?:\d{1,3}(?:[\s ]\d{3})+|\d+)\s*(?:–|-|až)?\s*(?:\d{1,3}(?:[\s ]\d{3})+)?\s*(?:tis\.?)?\s*(?:Kč|CZK)(?:\s*\/\s*(?:MD|měsíc|month|hod))?/i);
  return match ? { text: normaliseText(match[0]) } : undefined;
}

function inferLocation(text: string): string | undefined {
  const lines = text.split('\n').map(normaliseText).filter(Boolean);
  return lines.find((line) => /Praha|Brno|Ostrava|Plzeň|Olomouc|Liberec|Česko|Czech|remote/i.test(line) && line.length < 100);
}

function matchesTerm(job: ScrapedJob, term: string): boolean {
  const text = `${job.title} ${job.description}`.toLowerCase();
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  return words.some((word) => text.includes(word.replace('.js', '')) || text.includes(word));
}

async function textOf(page: Page, selector: string): Promise<string | undefined> {
  const element = page.locator(selector).first();
  if (await element.count() === 0) return undefined;
  const text = await element.innerText().catch(() => '');
  return normaliseText(text) || undefined;
}

async function extractJob(page: Page, url: string): Promise<ScrapedJob | undefined> {
  const title = await textOf(page, 'h1');
  if (!title) return undefined;
  const mainText = await textOf(page, 'main') ?? await textOf(page, 'body') ?? '';
  const company = await textOf(page, '[data-testid*="company"]')
    ?? await textOf(page, 'a[href*="/startup/"]')
    ?? 'StartupJobs company not detected';
  return {
    title,
    company,
    location: await textOf(page, '[data-testid*="location"]') ?? inferLocation(mainText),
    url,
    description: mainText,
    salary: inferSalary(mainText),
    remoteType: inferRemoteType(mainText),
  };
}

async function collectJobUrls(page: Page): Promise<string[]> {
  const hrefs = await page.locator('a[href*="/nabidka/"]').evaluateAll((anchors) => anchors.map((anchor) => (anchor as { href: string }).href));
  return [...new Set(hrefs.filter((href) => /\/nabidka\/\d+/i.test(href)))];
}

async function navigateAndSettle(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  // StartupJobs renders listing cards client-side after the initial HTML response.
  await page.waitForTimeout(1_200);
}

/**
 * Visits public StartupJobs pages at a deliberately low rate. It never logs in,
 * interacts with CAPTCHA/challenge pages, or attempts to evade site controls.
 */
export async function scrapeStartupJobs(): Promise<WorkerJobHydratedDocument[]> {
  const browser = await chromium.launch({ headless: env.playwrightHeadless });
  const context = await browser.newContext({ userAgent: 'ai-job-hunter/0.1 (local, respectful job research)' });
  const page = await context.newPage();
  const urlsByTerm = new Map<string, Set<string>>();
  let usedHomepageFallback = false;

  try {
    for (const term of searchTerms) {
      await delay(env.startupJobsRequestDelayMs);
      try {
        await navigateAndSettle(page, searchUrl(term));
        const pageText = await page.locator('body').innerText().catch(() => '');
        if (isCaptchaOrChallenge(pageText)) {
          console.warn(`StartupJobs challenge detected for "${term}"; skipping without bypassing it.`);
          continue;
        }
        let urls = await collectJobUrls(page);
        if (urls.length === 0 && !usedHomepageFallback) {
          usedHomepageFallback = true;
          await delay(env.startupJobsRequestDelayMs);
          await navigateAndSettle(page, env.startupJobsBaseUrl);
          urls = await collectJobUrls(page);
          console.warn(`No links found for "${term}" using ?${env.startupJobsSearchParam}=; homepage fallback found ${urls.length} links.`);
        }
        urlsByTerm.set(term, new Set(urls));
      } catch (error) {
        console.warn(`StartupJobs search failed for "${term}":`, error instanceof Error ? error.message : error);
      }
    }

    const uniqueUrls = [...new Set([...urlsByTerm.values()].flatMap((urls) => [...urls]))];
    const savedJobs: WorkerJobHydratedDocument[] = [];
    for (const url of uniqueUrls) {
      if (savedJobs.length >= env.startupJobsMaxJobs) break;
      await delay(env.startupJobsRequestDelayMs);
      try {
        await navigateAndSettle(page, url);
        const pageText = await page.locator('body').innerText().catch(() => '');
        if (isCaptchaOrChallenge(pageText)) {
          console.warn(`StartupJobs challenge detected at ${url}; skipping without bypassing it.`);
          continue;
        }
        const job = await extractJob(page, url);
        if (!job) { console.warn(`StartupJobs job extraction failed at ${url}; skipped.`); continue; }
        const associatedTerms = searchTerms.filter((term) => matchesTerm(job, term));
        if (associatedTerms.length === 0) { console.log(`Skipped non-matching job: ${job.title}`); continue; }
        const saved = await WorkerJobModel.findOneAndUpdate(
          { url: job.url },
          { $set: { ...job, source, languageRequirement: [], status: 'new' }, $unset: { score: 1, decision: 1, scoreDetails: 1 } },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
        );
        if (saved) savedJobs.push(saved);
      } catch (error) {
        console.warn(`StartupJobs detail scrape failed at ${url}:`, error instanceof Error ? error.message : error);
      }
    }
    console.log(`StartupJobs saved ${savedJobs.length} unique job records from ${uniqueUrls.length} discovered URLs.`);
    return savedJobs;
  } finally {
    await context.close();
    await browser.close();
  }
}
