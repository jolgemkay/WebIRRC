/**
 * scroll.ts — Scroll the page or a specific element.
 */
import { getPage } from "../browser.js";

export interface ScrollInput {
  /** CSS selector of the element to scroll. Defaults to document body. */
  selector?: string;
  /** Pixels to scroll on the x-axis. Defaults to 0. */
  x?: number;
  /** Pixels to scroll on the y-axis. Defaults to 400. */
  y?: number;
}

export interface ScrollResult {
  scrolled: { x: number; y: number };
  target: string;
}

export async function scroll(input: ScrollInput): Promise<ScrollResult> {
  const page = await getPage();
  const x = input.x ?? 0;
  const y = input.y ?? 400;
  const selector = input.selector;

  if (selector) {
    await page.locator(selector).evaluate(
      (el, { dx, dy }) => el.scrollBy(dx, dy),
      { dx: x, dy: y }
    );
  } else {
    await page.evaluate(({ dx, dy }) => window.scrollBy(dx, dy), { dx: x, dy: y });
  }

  return { scrolled: { x, y }, target: selector ?? "window" };
}
