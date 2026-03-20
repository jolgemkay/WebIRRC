/**
 * evaluate.ts — Execute arbitrary JavaScript in the page context and return
 * the result.
 *
 * Use sparingly; prefer structured skills when possible. This skill is useful
 * for reading DOM state or triggering imperative actions that no other skill
 * covers.
 */
import { getPage } from "../browser.js";

export interface EvaluateInput {
  /** JavaScript expression or function body to evaluate.
   *  If a function body is supplied (contains `return`), it is wrapped in an
   *  async IIFE automatically.
   */
  expression: string;
}

export interface EvaluateResult {
  result: unknown;
}

export async function evaluate(input: EvaluateInput): Promise<EvaluateResult> {
  const page = await getPage();
  const expr = input.expression.trimStart();
  // Wrap statement-like code in an async IIFE when a top-level `return`
  // statement is present.  We detect it by looking for `return` as a whole
  // word at the start of a line (after optional whitespace) so that property
  // names or string contents like "return-button" are not confused with a
  // return statement.
  const hasReturnStatement = /(?:^|[\n;{}])\s*return\b/.test(expr);
  const code = hasReturnStatement ? `(async () => { ${expr} })()` : expr;
  const result = await page.evaluate(code);
  return { result };
}
