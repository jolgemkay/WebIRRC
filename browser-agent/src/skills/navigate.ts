/**
 * navigate.ts — Navigate the current page to a URL.
 */
import { getPage } from "../browser.js";

export interface NavigateInput {
  url: string;
}

export interface NavigateResult {
  url: string;
  title: string;
}

export async function navigate(input: NavigateInput): Promise<NavigateResult> {
  const page = await getPage();
  await page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  return {
    url: page.url(),
    title: await page.title(),
  };
}
