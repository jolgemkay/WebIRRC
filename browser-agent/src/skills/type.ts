/**
 * type.ts — Type text into a focused or selected element.
 */
import { getPage } from "../browser.js";

export interface TypeInput {
  /** CSS selector for the input element. */
  selector: string;
  /** Text to type. */
  text: string;
  /** If true, clears the field first (default: true). */
  clear?: boolean;
}

export interface TypeResult {
  typed: string;
  into: string;
}

export async function typeText(input: TypeInput): Promise<TypeResult> {
  const page = await getPage();
  const clear = input.clear !== false;

  if (clear) {
    await page.fill(input.selector, input.text);
  } else {
    await page.type(input.selector, input.text);
  }

  return { typed: input.text, into: input.selector };
}
