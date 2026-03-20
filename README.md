# WebIRRC

Simple Arduino sketch that hosts an HTML based remote control and sends IR codes as GET requests to the ESP8266.
Would like to add some more code to address my TV, as this just handles my cable decoder. 
Havent figured out how to generate the Philips IR signals yet. 

---

## AI Browser-Automation Agent

A token-efficient AI agent that controls a real browser using pre-defined,
reusable **skills** — inspired by Vercel's
[agent-browser](https://github.com/vercel-labs/agent-browser) pattern.

### How it works

The agent runs an **observe → plan → act** loop powered by OpenAI function
calling:

1. **Observe** – call the `snapshot` skill to get a compact, text-only
   accessibility tree of the current page (far fewer tokens than a screenshot).
2. **Plan** – the model picks the next skill to call based on the snapshot and
   the goal.
3. **Act** – the chosen skill is executed in the browser (Playwright).
4. Repeat until the model calls `done`.

### Skills

| Skill | What it does |
|-------|-------------|
| `navigate` | Open a URL |
| `snapshot` | Return the page accessibility tree (token-efficient observation) |
| `click` | Click an element by ARIA role/name, visible text, or CSS selector |
| `type` | Fill an input field |
| `press` | Press a keyboard key |
| `select` | Choose a `<select>` option by label |
| `scroll` | Scroll the page or an element |
| `wait_for_text` | Wait until text appears on the page |
| `wait_for_url` | Wait until the URL matches a pattern |
| `extract_text` | Read visible text from an element |
| `extract_attribute` | Read an HTML attribute value |
| `screenshot` | Save a PNG (fallback when visual verification is needed) |
| `done` | Signal task completion with a summary |

### Token-efficiency techniques

- **Accessibility snapshots** (plain text) instead of base-64 screenshots
  — typically 10–50× fewer tokens.
- **Rolling context window** — only the last `CONTEXT_WINDOW` messages are
  sent to the model (default: 40).
- **Compact system prompt** — describes the loop, not every skill detail.
- **Function calling** — structured skill dispatch with no free-form parsing.

### Setup

```bash
# Install dependencies (Node ≥ 18 required)
npm install

# Install the Chromium browser used by Playwright
npm run install:browsers
```

### Usage

```bash
OPENAI_API_KEY=sk-… node agent/index.js "Go to example.com and tell me the page title"
```

#### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | *(required)* | Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model to use |
| `MAX_TURNS` | `20` | Hard stop after this many agent turns |
| `CONTEXT_WINDOW` | `40` | Messages kept in the rolling history |

#### Use as a library

```js
import { runAgent } from './agent/index.js';

const result = await runAgent('Search for "WebIRRC" on GitHub and return the first result URL');
console.log(result);
```

### Project structure

```
agent/
├── index.js    – Main agent loop (observe → plan → act)
├── browser.js  – Playwright browser wrapper + accessibility snapshot helper
├── skills.js   – All skill definitions and dispatcher
└── prompts.js  – System prompt and message-format helpers
WebIRRC/
└── WebIRRC.ino – ESP8266 IR remote control Arduino sketch
minimal.html    – Standalone remote control UI
```
