/**
 * browser.ts — shared Playwright browser/page lifecycle management.
 *
 * A single browser instance is kept open for the lifetime of the MCP server
 * process. Each call to getPage() returns the current active page (or opens a
 * blank one if none exists yet), so skills always have a page to work with
 * without the overhead of launching a new browser per request.
 */
import { chromium, type Browser, type Page } from "playwright";

let browser: Browser | null = null;
let activePage: Page | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function getPage(): Promise<Page> {
  const b = await getBrowser();

  // Reuse the existing page if it is still open
  if (activePage && !activePage.isClosed()) {
    return activePage;
  }

  // Otherwise open a fresh one
  const ctx = await b.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  activePage = await ctx.newPage();
  return activePage;
}

/** Close the browser entirely (called on SIGINT/SIGTERM). */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    activePage = null;
  }
}
