import { autoPrepareScrapedJobs, hasLatestCvProfile, shouldAutoAnalyzeJobs } from './automation.js';
import { scoreJobs } from './job-scorer.js';
import { scrapeStartupJobs } from './startupjobs-scraper.js';

/** End-to-end local-only flow. The scraper deduplicates by job URL; no application is ever submitted. */
export async function runAutomaticPreparationFlow(): Promise<void> {
  if (!await hasLatestCvProfile()) throw new Error('run:auto için önce ham metni çıkarılmış bir CVProfile yüklemelisiniz.');
  console.log('[run:auto] Latest CVProfile bulundu. StartupJobs scrape başlıyor.');
  const jobs = await scrapeStartupJobs();
  console.log(`[run:auto] ${jobs.length} benzersiz iş kaydedildi/upsert edildi.`);
  if (!await shouldAutoAnalyzeJobs()) {
    console.log('[run:auto] autoAnalyzeJobs kapalı; skorlama ve otomatik hazırlama atlandı.');
    return;
  }
  await scoreJobs(jobs);
  console.log('[run:auto] İşler skorlandı; otomatik hazırlama kuralları uygulanıyor.');
  for (const message of await autoPrepareScrapedJobs(jobs)) console.log(`[run:auto] ${message}`);
  console.log('[run:auto] Akış tamamlandı. Hiçbir başvuru submit edilmedi.');
}
