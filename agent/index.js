/**
 * index.js – Token-efficient AI agent for browser automation.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-… node agent/index.js "Go to example.com and get the page title"
 *
 * Environment variables:
 *   OPENAI_API_KEY   (required) OpenAI API key.
 *   OPENAI_MODEL     (optional) Model to use, default: gpt-4o-mini.
 *   MAX_TURNS        (optional) Max agent turns before giving up, default: 20.
 *   CONTEXT_WINDOW   (optional) Max messages kept in history, default: 40.
 *
 * Architecture (Vercel agent-browser inspired):
 * ─────────────────────────────────────────────
 * The agent runs an observe → plan → act loop using OpenAI function calling.
 * Each skill is exposed as an OpenAI tool so the model picks the right action
 * in a single, structured API call — no parsing of free-form text required.
 *
 * Token efficiency:
 * - Accessibility snapshots (plain text) instead of base-64 screenshots.
 * - Rolling context window: only the last CONTEXT_WINDOW messages are sent.
 * - Short system prompt that describes only the loop, not every skill.
 * - Concise tool descriptions that keep the function-calling schema small.
 */

import OpenAI from 'openai';
import { closeBrowser } from './browser.js';
import { buildTools, runSkill } from './skills.js';
import { systemPrompt, toolResultMessage, userTaskMessage } from './prompts.js';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_TURNS = parseInt(process.env.MAX_TURNS || '20', 10);
const CONTEXT_WINDOW = parseInt(process.env.CONTEXT_WINDOW || '40', 10);

if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set.');
  process.exit(1);
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Agent loop
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the agent for a given natural-language task.
 *
 * @param {string} task  What the agent should accomplish.
 * @returns {Promise<string>}  Final summary from the `done` skill.
 */
export async function runAgent(task) {
  const tools = buildTools();

  /** @type {import('openai').OpenAI.Chat.Completions.ChatCompletionMessageParam[]} */
  const history = [userTaskMessage(task)];

  let turns = 0;

  while (turns < MAX_TURNS) {
    turns++;

    // Keep only the last CONTEXT_WINDOW messages to bound token usage.
    const contextMessages = history.slice(-CONTEXT_WINDOW);

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt() }, ...contextMessages],
      tools,
      tool_choice: 'auto',
    });

    const message = response.choices[0].message;
    history.push(message);

    // No tool calls → the model answered in plain text (unexpected but handled).
    if (!message.tool_calls || message.tool_calls.length === 0) {
      const content = message.content || '';
      console.log(`[agent] Model replied without tool call:\n${content}`);
      return content;
    }

    // Execute each requested skill and collect results.
    const resultMessages = await Promise.all(
      message.tool_calls.map(async (call) => {
        const args = JSON.parse(call.function.arguments || '{}');
        console.log(`[agent] → ${call.function.name}(${JSON.stringify(args)})`);

        const result = await runSkill(call.function.name, args);
        console.log(`[agent] ← ${result.slice(0, 200)}`);

        // If the agent called `done`, return signal to break the loop.
        if (call.function.name === 'done') {
          return { done: true, summary: result, msg: toolResultMessage(call.id, result) };
        }

        return { done: false, summary: null, msg: toolResultMessage(call.id, result) };
      })
    );

    // Push all results into history.
    for (const r of resultMessages) {
      history.push(r.msg);
    }

    // If any skill was `done`, return the summary.
    const doneResult = resultMessages.find((r) => r.done);
    if (doneResult) {
      return doneResult.summary;
    }
  }

  return `Agent stopped after ${MAX_TURNS} turns without completing the task.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry point
// ─────────────────────────────────────────────────────────────────────────────

if (process.argv[1].endsWith('index.js')) {
  const task = process.argv.slice(2).join(' ').trim();

  if (!task) {
    console.error('Usage: node agent/index.js "<task description>"');
    process.exit(1);
  }

  console.log(`[agent] Task: ${task}`);
  console.log(`[agent] Model: ${MODEL} | Max turns: ${MAX_TURNS}`);

  try {
    const result = await runAgent(task);
    console.log(`\n[agent] Result:\n${result}`);
  } finally {
    await closeBrowser();
  }
}
