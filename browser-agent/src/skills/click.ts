/**
 * click.ts — Click a page element identified by CSS selector or ref id.
 */
import { getPage } from "../browser.js";

export interface ClickInput {
  /** CSS selector for the element to click. */
  selector: string;
  /** Optional: click type. Defaults to "left". */
  button?: "left" | "right" | "middle";
  /** Optional: number of clicks. Defaults to 1. */
  clickCount?: number;
}

export interface ClickResult {
  clicked: string;
}

export async function click(input: ClickInput): Promise<ClickResult> {
  const page = await getPage();
  await page.click(input.selector, {
    button: input.button ?? "left",
    clickCount: input.clickCount ?? 1,
  });
  return { clicked: input.selector };
}
