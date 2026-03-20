/**
 * browser.js – Playwright browser wrapper for the AI agent.
 *
 * Provides a single shared browser + page instance and exposes helpers that
 * the skill implementations need (navigation, interaction, accessibility
 * snapshot, etc.).  The accessibility snapshot is a compact text
 * representation of the live DOM, far cheaper in tokens than a base-64
 * screenshot image.
 */

import { chromium } from 'playwright';

/** @type {import('playwright').Browser | null} */
let _browser = null;

/** @type {import('playwright').Page | null} */
let _page = null;

/**
 * Lazily launch the browser and return the shared page.
 * @returns {Promise<import('playwright').Page>}
 */
export async function getPage() {
  if (!_browser) {
    _browser = await chromium.launch({ headless: true });
  }
  if (!_page || _page.isClosed()) {
    _page = await _browser.newPage();
    // Use a realistic viewport so layout-dependent buttons are visible.
    await _page.setViewportSize({ width: 1280, height: 800 });
  }
  return _page;
}

/**
 * Close the browser gracefully.
 */
export async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
    _page = null;
  }
}

/**
 * Return a compact, token-efficient text snapshot of the current page by
 * using Playwright's built-in accessibility tree serializer.
 *
 * The snapshot omits invisible nodes, decorative images, and raw scripts,
 * keeping only the information an agent needs to reason about the page.
 *
 * @returns {Promise<string>}
 */
export async function getAccessibilitySnapshot() {
  const page = await getPage();
  const url = page.url();
  const title = await page.title().catch(() => '');

  // `page.accessibility.snapshot()` returns a JSON tree; we flatten it to
  // an indented text list which is more token-efficient than JSON.
  const tree = await page.accessibility.snapshot({ interestingOnly: true });
  const lines = [`URL: ${url}`, `Title: ${title}`, '---'];
  flattenTree(tree, lines, 0);
  return lines.join('\n');
}

/**
 * Recursively flatten an accessibility node tree into indented text lines.
 * @param {object|null} node
 * @param {string[]} lines
 * @param {number} depth
 */
function flattenTree(node, lines, depth) {
  if (!node) return;
  const indent = '  '.repeat(depth);
  const role = node.role || '';
  const name = node.name ? ` "${node.name}"` : '';
  const value = node.value !== undefined ? ` = ${node.value}` : '';
  const checked = node.checked !== undefined ? ` [checked=${node.checked}]` : '';
  const disabled = node.disabled ? ' [disabled]' : '';
  lines.push(`${indent}${role}${name}${value}${checked}${disabled}`);
  for (const child of node.children || []) {
    flattenTree(child, lines, depth + 1);
  }
}
