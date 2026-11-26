// Kept apart from the AI libraries, so pages that only ask "is it set up?" do not load them.
export const claudeKey = () => (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "").trim();
export const geminiKey = () => (process.env.GEMINI_API_KEY || "").trim();
export const claudeReady = () => Boolean(claudeKey());
export const geminiReady = () => Boolean(geminiKey());
