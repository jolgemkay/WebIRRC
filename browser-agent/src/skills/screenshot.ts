/**
 * screenshot.ts — Capture a screenshot of the current page (or a specific
 * element).  Returns the image as a base64-encoded PNG string.
 *
 * Screenshots are expensive in terms of tokens; prefer the `snapshot` skill
 * for navigation tasks.  Use screenshots only when visual verification is
 * required.
 */
import { getPage } from "../browser.js";

export interface ScreenshotInput {
  /** CSS selector of the element to capture. If omitted, captures the full
   *  viewport. */
  selector?: string;
  /** Capture the full scrollable page (ignored when selector is set). */
  fullPage?: boolean;
}

export interface ScreenshotResult {
  /** Base64-encoded PNG data. */
  data: string;
  mimeType: "image/png";
}

export async function screenshot(
  input: ScreenshotInput
): Promise<ScreenshotResult> {
  const page = await getPage();
  let buffer: Buffer;

  if (input.selector) {
    const el = page.locator(input.selector);
    buffer = await el.screenshot({ type: "png" });
  } else {
    buffer = await page.screenshot({
      type: "png",
      fullPage: input.fullPage ?? false,
    });
  }

  return {
    data: buffer.toString("base64"),
    mimeType: "image/png",
  };
}
