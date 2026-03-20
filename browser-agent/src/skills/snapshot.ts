/**
 * snapshot.ts — Return a compact, token-efficient accessibility snapshot of
 * the current page.
 *
 * Uses Playwright's `ariaSnapshot()` API which returns a YAML-formatted ARIA
 * tree.  This is 5–20× smaller than raw HTML and gives the model exactly the
 * information it needs to identify interactive elements.
 *
 * This mirrors the approach used by Vercel's @vercel/agent-browser and
 * Microsoft's Playwright MCP server.
 */
import { getPage } from "../browser.js";

export interface SnapshotResult {
  url: string;
  title: string;
  /** YAML-formatted ARIA tree of the page body. */
  snapshot: string;
}

export async function snapshot(): Promise<SnapshotResult> {
  const page = await getPage();
  const ariaYaml = await page.locator("body").ariaSnapshot();
  return {
    url: page.url(),
    title: await page.title(),
    snapshot: ariaYaml,
  };
}
