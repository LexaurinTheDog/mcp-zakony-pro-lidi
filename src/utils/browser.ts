/**
 * Browser manager for efficient Playwright usage
 * Implements singleton pattern with lazy initialization
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';

class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private initPromise: Promise<Browser> | null = null;

  /**
   * Get or create browser instance
   */
  async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) {
      return this.browser;
    }

    // If already initializing, wait for that
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start new initialization
    this.initPromise = chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    try {
      this.browser = await this.initPromise;
      return this.browser;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Get or create browser context with proper settings
   */
  async getContext(): Promise<BrowserContext> {
    if (this.context && !this.context.pages().length) {
      return this.context;
    }

    const browser = await this.getBrowser();

    this.context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'cs-CZ',
      viewport: { width: 1920, height: 1080 },
      acceptDownloads: false,
      ignoreHTTPSErrors: true
    });

    return this.context;
  }

  /**
   * Create a new page for scraping
   */
  async newPage(): Promise<Page> {
    const context = await this.getContext();
    const page = await context.newPage();

    // Set reasonable timeouts
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(10000);

    return page;
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}

// Export singleton instance
export const browserManager = new BrowserManager();

// Cleanup on process exit
process.on('SIGINT', async () => {
  await browserManager.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await browserManager.close();
  process.exit(0);
});
