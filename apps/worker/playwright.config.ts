import { defineConfig } from 'playwright/test';

export default defineConfig({
  use: { headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' },
});
