#!/usr/bin/env node
/**
 * index.ts — WebIRRC Browser-Automation MCP Server
 *
 * Implements a Model Context Protocol (MCP) server that exposes browser
 * automation skills to AI coding tools (Claude Code, VS Code Copilot,
 * opencode, etc.).
 *
 * Skills exposed as MCP tools:
 *   browser_navigate  – Navigate to a URL
 *   browser_snapshot  – Return the accessibility tree (token-efficient)
 *   browser_click     – Click an element
 *   browser_type      – Fill / type into an element
 *   browser_scroll    – Scroll the page or a container
 *   browser_evaluate  – Execute JavaScript in the page
 *   browser_screenshot – Capture a screenshot (base64 PNG)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { navigate } from "./skills/navigate.js";
import { snapshot } from "./skills/snapshot.js";
import { click } from "./skills/click.js";
import { typeText } from "./skills/type.js";
import { scroll } from "./skills/scroll.js";
import { evaluate } from "./skills/evaluate.js";
import { screenshot } from "./skills/screenshot.js";
import { closeBrowser } from "./browser.js";

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "webirrc-browser-agent",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Tool: browser_navigate
// ---------------------------------------------------------------------------

server.tool(
  "browser_navigate",
  "Navigate the browser to a URL and return the page title and final URL.",
  {
    url: z.string().url().describe("The URL to navigate to"),
  },
  async ({ url }) => {
    const result = await navigate({ url });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: browser_snapshot
// ---------------------------------------------------------------------------

server.tool(
  "browser_snapshot",
  "Return a compact accessibility-tree snapshot of the current page. " +
    "Prefer this over screenshots for navigation tasks — it is far more " +
    "token-efficient.",
  {},
  async () => {
    const result = await snapshot();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: browser_click
// ---------------------------------------------------------------------------

server.tool(
  "browser_click",
  "Click an element on the page identified by a CSS selector.",
  {
    selector: z
      .string()
      .describe("CSS selector of the element to click"),
    button: z
      .enum(["left", "right", "middle"])
      .optional()
      .describe("Mouse button to use (default: left)"),
    clickCount: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Number of clicks (default: 1)"),
  },
  async ({ selector, button, clickCount }) => {
    const result = await click({ selector, button, clickCount });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: browser_type
// ---------------------------------------------------------------------------

server.tool(
  "browser_type",
  "Fill text into an input element identified by a CSS selector.",
  {
    selector: z
      .string()
      .describe("CSS selector of the input element"),
    text: z.string().describe("Text to type"),
    clear: z
      .boolean()
      .optional()
      .describe("Clear the field first (default: true)"),
  },
  async ({ selector, text, clear }) => {
    const result = await typeText({ selector, text, clear });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: browser_scroll
// ---------------------------------------------------------------------------

server.tool(
  "browser_scroll",
  "Scroll the page or a specific element by a given number of pixels.",
  {
    selector: z
      .string()
      .optional()
      .describe(
        "CSS selector of the element to scroll. Omit to scroll the whole page."
      ),
    x: z
      .number()
      .optional()
      .describe("Pixels to scroll on the x-axis (default: 0)"),
    y: z
      .number()
      .optional()
      .describe("Pixels to scroll on the y-axis (default: 400)"),
  },
  async ({ selector, x, y }) => {
    const result = await scroll({ selector, x, y });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: browser_evaluate
// ---------------------------------------------------------------------------

server.tool(
  "browser_evaluate",
  "Execute JavaScript in the page context and return the result. " +
    "Use sparingly; prefer structured skills when possible.",
  {
    expression: z
      .string()
      .describe(
        "JavaScript expression or statements to evaluate. " +
          "Use `return` for multi-statement code."
      ),
  },
  async ({ expression }) => {
    const result = await evaluate({ expression });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: browser_screenshot
// ---------------------------------------------------------------------------

server.tool(
  "browser_screenshot",
  "Capture a screenshot of the current page (or a specific element) and " +
    "return it as a base64-encoded PNG. Prefer browser_snapshot for " +
    "navigation tasks; use this only for visual verification.",
  {
    selector: z
      .string()
      .optional()
      .describe(
        "CSS selector of the element to capture. Omit for the full viewport."
      ),
    fullPage: z
      .boolean()
      .optional()
      .describe("Capture the full scrollable page (default: false)"),
  },
  async ({ selector, fullPage }) => {
    const result = await screenshot({ selector, fullPage });
    return {
      content: [
        {
          type: "image",
          data: result.data,
          mimeType: result.mimeType,
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    await closeBrowser();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
