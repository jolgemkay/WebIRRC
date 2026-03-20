/**
 * skills.js – Reusable browser-automation skills for the AI agent.
 *
 * Each skill is an object with:
 *   - name      : unique identifier used by the LLM
 *   - description: concise description for the function-calling schema
 *   - parameters: JSON-Schema for the LLM to fill in
 *   - run(args) : async implementation
 *
 * Design goals
 * ────────────
 * 1. Token-efficient – each skill has a short, precise description.
 * 2. Composable     – simple primitives that combine into complex flows.
 * 3. Idempotent     – safe to retry on transient failures.
 */

import { getPage, getAccessibilitySnapshot } from './browser.js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const NAVIGATION_TIMEOUT = 30_000;
const INTERACTION_TIMEOUT = 10_000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a locator from a role/name description or a CSS/text selector.
 * Prefers ARIA role + accessible name (most resilient), falls back to
 * getByText, then to a raw CSS selector.
 *
 * @param {import('playwright').Page} page
 * @param {string} selector  e.g. 'button[name="Submit"]', 'text=OK', or 'button'
 * @returns {import('playwright').Locator}
 */
function resolve(page, selector) {
  // role[name="…"] shorthand  →  getByRole
  const roleMatch = selector.match(/^(\w+)\[name="(.+?)"\]$/);
  if (roleMatch) {
    return page.getByRole(roleMatch[1], { name: roleMatch[2] });
  }
  // text=…  →  getByText
  if (selector.startsWith('text=')) {
    return page.getByText(selector.slice(5), { exact: false });
  }
  // aria-label=…  →  getByLabel
  if (selector.startsWith('aria-label=')) {
    return page.getByLabel(selector.slice(11));
  }
  // placeholder=…  →  getByPlaceholder
  if (selector.startsWith('placeholder=')) {
    return page.getByPlaceholder(selector.slice(12));
  }
  // Default: raw CSS / XPath
  return page.locator(selector);
}

// ─────────────────────────────────────────────────────────────────────────────
// Skill definitions
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {{ name: string, description: string, parameters: object, run: (args: object) => Promise<string> }} Skill */

/** @type {Skill[]} */
export const skills = [
  // ── Navigation ──────────────────────────────────────────────────────────
  {
    name: 'navigate',
    description: 'Navigate the browser to a URL.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Absolute URL to open.' },
      },
      required: ['url'],
    },
    async run({ url }) {
      const page = await getPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT });
      return `Navigated to ${page.url()}`;
    },
  },

  // ── Observation ─────────────────────────────────────────────────────────
  {
    name: 'snapshot',
    description:
      'Return the current page accessibility snapshot (URL, title, interactive elements). ' +
      'Always call this after navigation or interaction to observe the new state.',
    parameters: { type: 'object', properties: {} },
    async run() {
      return getAccessibilitySnapshot();
    },
  },

  // ── Interaction ─────────────────────────────────────────────────────────
  {
    name: 'click',
    description:
      'Click an element identified by a selector. ' +
      'Selector formats: ' +
      '"button[name=\\"OK\\"]" (ARIA role+name), ' +
      '"text=Submit" (visible text), ' +
      '"aria-label=Close" (aria-label), ' +
      'or a CSS selector.',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Element selector.' },
      },
      required: ['selector'],
    },
    async run({ selector }) {
      const page = await getPage();
      const locator = resolve(page, selector);
      await locator.first().click({ timeout: INTERACTION_TIMEOUT });
      return `Clicked "${selector}"`;
    },
  },

  {
    name: 'type',
    description: 'Focus an input and type text into it (clears existing value first).',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Input element selector.' },
        text: { type: 'string', description: 'Text to type.' },
      },
      required: ['selector', 'text'],
    },
    async run({ selector, text }) {
      const page = await getPage();
      const locator = resolve(page, selector);
      await locator.first().fill(text, { timeout: INTERACTION_TIMEOUT });
      return `Typed "${text}" into "${selector}"`;
    },
  },

  {
    name: 'press',
    description: 'Press a keyboard key (e.g. Enter, Tab, Escape, ArrowDown).',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Playwright key name.' },
      },
      required: ['key'],
    },
    async run({ key }) {
      const page = await getPage();
      await page.keyboard.press(key);
      return `Pressed key "${key}"`;
    },
  },

  {
    name: 'select',
    description: 'Select an option in a <select> dropdown by its visible label.',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: '<select> element selector.' },
        label: { type: 'string', description: 'Visible option text to select.' },
      },
      required: ['selector', 'label'],
    },
    async run({ selector, label }) {
      const page = await getPage();
      const locator = resolve(page, selector);
      await locator.first().selectOption({ label }, { timeout: INTERACTION_TIMEOUT });
      return `Selected "${label}" in "${selector}"`;
    },
  },

  // ── Scrolling ────────────────────────────────────────────────────────────
  {
    name: 'scroll',
    description: 'Scroll the page or an element in a given direction.',
    parameters: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['up', 'down', 'left', 'right'],
          description: 'Scroll direction.',
        },
        amount: {
          type: 'number',
          description: 'Pixels to scroll (default 300).',
        },
        selector: {
          type: 'string',
          description: 'Optional CSS selector of element to scroll (default: page).',
        },
      },
      required: ['direction'],
    },
    async run({ direction, amount = 300, selector }) {
      const page = await getPage();
      const deltaX = direction === 'right' ? amount : direction === 'left' ? -amount : 0;
      const deltaY = direction === 'down' ? amount : direction === 'up' ? -amount : 0;
      if (selector) {
        await resolve(page, selector).first().evaluate(
          (el, { dx, dy }) => el.scrollBy(dx, dy),
          { dx: deltaX, dy: deltaY }
        );
      } else {
        await page.mouse.wheel(deltaX, deltaY);
      }
      return `Scrolled ${direction} by ${amount}px`;
    },
  },

  // ── Waiting ──────────────────────────────────────────────────────────────
  {
    name: 'wait_for_text',
    description: 'Wait until a specific text string appears on the page.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to wait for.' },
        timeout: {
          type: 'number',
          description: 'Max wait in milliseconds (default 10000).',
        },
      },
      required: ['text'],
    },
    async run({ text, timeout = INTERACTION_TIMEOUT }) {
      const page = await getPage();
      await page.waitForFunction(
        (t) => document.body.innerText.includes(t),
        text,
        { timeout }
      );
      return `Text "${text}" appeared on the page`;
    },
  },

  {
    name: 'wait_for_url',
    description: 'Wait until the page URL matches a substring or regex pattern.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Substring or regex (as string) to match against the URL.',
        },
        timeout: {
          type: 'number',
          description: 'Max wait in milliseconds (default 10000).',
        },
      },
      required: ['pattern'],
    },
    async run({ pattern, timeout = INTERACTION_TIMEOUT }) {
      const page = await getPage();
      await page.waitForURL(new RegExp(pattern), { timeout });
      return `URL now matches "${pattern}": ${page.url()}`;
    },
  },

  // ── Extraction ───────────────────────────────────────────────────────────
  {
    name: 'extract_text',
    description: 'Extract and return the visible text content of an element.',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Element selector.' },
      },
      required: ['selector'],
    },
    async run({ selector }) {
      const page = await getPage();
      const text = await resolve(page, selector).first().innerText({ timeout: INTERACTION_TIMEOUT });
      return `Text of "${selector}": ${text}`;
    },
  },

  {
    name: 'extract_attribute',
    description: 'Extract the value of an HTML attribute from an element.',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Element selector.' },
        attribute: { type: 'string', description: 'Attribute name, e.g. "href" or "value".' },
      },
      required: ['selector', 'attribute'],
    },
    async run({ selector, attribute }) {
      const page = await getPage();
      const value = await resolve(page, selector).first().getAttribute(attribute, { timeout: INTERACTION_TIMEOUT });
      return `${attribute} of "${selector}": ${value}`;
    },
  },

  // ── Screenshot (fallback observation) ───────────────────────────────────
  {
    name: 'screenshot',
    description:
      'Capture a PNG screenshot of the current page and save it to a file. ' +
      'Use only when visual verification is required; prefer snapshot for token efficiency.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to save the PNG to (e.g. "/tmp/page.png").',
        },
      },
      required: ['path'],
    },
    async run({ path }) {
      const page = await getPage();
      await page.screenshot({ path, fullPage: false });
      return `Screenshot saved to ${path}`;
    },
  },

  // ── Done ─────────────────────────────────────────────────────────────────
  {
    name: 'done',
    description:
      'Signal that the task is complete. Call this when the goal has been achieved.',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Brief summary of what was accomplished.',
        },
      },
      required: ['summary'],
    },
    async run({ summary }) {
      return `DONE: ${summary}`;
    },
  },
];

/**
 * Build the OpenAI `tools` array from skill definitions.
 * @returns {import('openai').OpenAI.Chat.Completions.ChatCompletionTool[]}
 */
export function buildTools() {
  return skills.map((skill) => ({
    type: 'function',
    function: {
      name: skill.name,
      description: skill.description,
      parameters: skill.parameters,
    },
  }));
}

/**
 * Execute a skill by name with the given parsed arguments.
 * @param {string} name
 * @param {object} args
 * @returns {Promise<string>}
 */
export async function runSkill(name, args) {
  const skill = skills.find((s) => s.name === name);
  if (!skill) {
    return `Error: unknown skill "${name}"`;
  }
  try {
    return await skill.run(args);
  } catch (err) {
    return `Error in skill "${name}": ${err.message}`;
  }
}
