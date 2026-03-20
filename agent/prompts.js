/**
 * prompts.js – Token-efficient prompt templates for the AI agent.
 *
 * Keeping the system prompt short and structured is the single biggest lever
 * for reducing token usage per agent turn.
 */

/**
 * Concise system prompt.  It tells the model:
 *   1. Its role and constraints.
 *   2. The observe-plan-act loop it must follow.
 *   3. That it should call `done` when finished.
 *
 * @returns {string}
 */
export function systemPrompt() {
  return (
    'You are a browser-automation agent. ' +
    'You have a set of skills (functions) to control a real browser. ' +
    'Follow this loop:\n' +
    '1. Call `snapshot` to observe the current page state.\n' +
    '2. Decide the next action and call the appropriate skill.\n' +
    '3. Repeat until the task is complete, then call `done`.\n\n' +
    'Rules:\n' +
    '- Prefer `snapshot` over `screenshot` for observations (fewer tokens).\n' +
    '- Always call `snapshot` after navigating or interacting.\n' +
    '- Be concise in tool arguments.\n' +
    '- Never ask the user for clarification mid-task; make reasonable decisions.\n' +
    '- If an action fails, try an alternative approach.'
  );
}

/**
 * Format a skill result as a tool-response message for the conversation history.
 *
 * @param {string} toolCallId   The tool_call_id from the assistant message.
 * @param {string} content      The string returned by the skill.
 * @returns {import('openai').OpenAI.Chat.Completions.ChatCompletionToolMessageParam}
 */
export function toolResultMessage(toolCallId, content) {
  return {
    role: 'tool',
    tool_call_id: toolCallId,
    content,
  };
}

/**
 * Build the initial user message for a task.
 *
 * @param {string} task  Natural-language task description.
 * @returns {import('openai').OpenAI.Chat.Completions.ChatCompletionUserMessageParam}
 */
export function userTaskMessage(task) {
  return { role: 'user', content: task };
}
