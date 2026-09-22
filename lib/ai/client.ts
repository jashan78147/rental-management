import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = "claude-opus-5";

let client: Anthropic | null = null;

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function aiClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

/** Narrow the SDK error surface so a bad key degrades instead of taking a page down. */
export function describeAiError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Rate limited by the Anthropic API. Try again shortly.";
  }
  if (error instanceof Anthropic.APIError) {
    return `Anthropic API error ${error.status}: ${error.message}`;
  }
  return error instanceof Error ? error.message : "Unknown error calling the model.";
}
