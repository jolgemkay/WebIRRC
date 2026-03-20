# WebIRRC Browser-Automation Agent

A **token-efficient** MCP (Model Context Protocol) server that exposes browser
automation skills to AI coding tools such as
[Claude Code](https://claude.ai/code),
[VS Code GitHub Copilot](https://github.com/features/copilot), and
[opencode](https://opencode.ai).

The agent is implemented with **Playwright** (headless Chromium) and follows
the same skill-based architecture used by
[Vercel's `@vercel/agent-browser`](https://github.com/vercel/ai/tree/main/packages/ai) —
each skill is a small, focused function; the MCP server wires them together as
callable tools.

---

## Quick start

### 1. Install dependencies & build

```bash
cd browser-agent
npm install
npx playwright install chromium --with-deps
npm run build
```

### 2. Run the server

```bash
node dist/index.js
```

The server communicates over **stdio** (standard MCP transport).  You do not
need to start it manually — AI tools launch it automatically once configured
(see [Tool integration](#tool-integration) below).

---

## Available skills (MCP tools)

| Tool | Description |
|---|---|
| `browser_navigate` | Navigate to a URL; returns title & final URL |
| `browser_snapshot` | Compact accessibility-tree snapshot — **use this first** |
| `browser_click` | Click an element by CSS selector |
| `browser_type` | Fill / type text into an input element |
| `browser_scroll` | Scroll the page or a container element |
| `browser_evaluate` | Execute JavaScript in the page context |
| `browser_screenshot` | Capture a PNG screenshot (base64) |

### Token-efficiency tip

`browser_snapshot` returns the **accessibility tree** — a structured JSON
representation of the page that is 5–20× smaller than raw HTML and contains
exactly the information the model needs to choose the next action.  Use
`browser_screenshot` only when visual inspection is necessary.

---

## Tool integration

### Claude Code

Claude Code auto-discovers `.mcp.json` at the project root.  The file is
already included in this repository.  After building the agent, Claude Code
will offer the `browser_*` tools automatically.

```bash
# Verify the server starts cleanly
node browser-agent/dist/index.js
# Ctrl-C to stop
```

You can also register it globally (applies to all projects):

```bash
claude mcp add browser node /absolute/path/to/WebIRRC/browser-agent/dist/index.js
```

### VS Code (GitHub Copilot)

Add the server to your VS Code user or workspace settings
(`.vscode/mcp.json` or `settings.json`):

```jsonc
// .vscode/mcp.json
{
  "servers": {
    "webirrc-browser": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/browser-agent/dist/index.js"]
    }
  }
}
```

Reload VS Code and the Copilot Chat panel will show the `browser_*` tools in
its tool list.

### opencode

Add the server to `~/.config/opencode/config.json` (or the project-local
`.opencode/config.json`):

```json
{
  "mcp": {
    "servers": {
      "browser": {
        "type": "local",
        "command": ["node", "/absolute/path/to/WebIRRC/browser-agent/dist/index.js"]
      }
    }
  }
}
```

---

## Example agent workflow

A typical AI-driven browser session follows this pattern:

```
1. browser_navigate { url: "http://webirrc.local" }
   → { url, title }

2. browser_snapshot {}
   → { url, title, tree: [...] }   ← model reads the accessibility tree

3. browser_click { selector: "button.remote-btn" }
   → { clicked }

4. browser_snapshot {}             ← verify the action took effect
   → { url, title, tree: [...] }
```

The model only calls `browser_screenshot` when it needs visual confirmation
(e.g., checking that a dialog appeared).

---

## Architecture

```
browser-agent/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # MCP server — registers all tools
    ├── browser.ts        # Shared Playwright browser/page singleton
    └── skills/
        ├── navigate.ts   # browser_navigate
        ├── snapshot.ts   # browser_snapshot  (accessibility tree)
        ├── click.ts      # browser_click
        ├── type.ts       # browser_type
        ├── scroll.ts     # browser_scroll
        ├── evaluate.ts   # browser_evaluate
        └── screenshot.ts # browser_screenshot
```

A single Playwright browser instance is kept alive for the lifetime of the MCP
server process; skills share one active page via `browser.ts`.  This avoids
the startup overhead of launching a new browser on every request.

---

## Development

```bash
cd browser-agent
npm run dev   # TypeScript watch mode
```

To run against a real device, point your router/DNS so that the hostname
`webirrc.local` resolves to your ESP8266, then navigate from the agent:

```
browser_navigate { url: "http://webirrc.local" }
```
