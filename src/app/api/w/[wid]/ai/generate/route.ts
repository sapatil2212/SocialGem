import { guardWorkspace } from "@/server/guard";
import { askText, claudeReady } from "@/server/ai/client";
import { generateText } from "@/server/muapi";
import { caption } from "@/server/schemas";

const GUIDES: Record<string, string> = {
  facebook: "Warm and local. A short hook, then the details, then one clear action.",
  instagram: "A first line that stops the scroll, short paragraphs, a friendly call to action. 5 to 8 tags.",
  x_twitter: "One clear thought under 240 characters including tags. At most 2 tags.",
  linkedin: "Professional and useful, with short paragraphs and a closing question. 3 to 5 tags.",
  threads: "Casual and conversational, under 450 characters. 2 or 3 tags.",
  youtube: "A clickable but honest title under 70 characters and a structured description. 4 to 6 tags.",
  tiktok: "An energetic caption under 140 characters. 3 to 5 tags.",
  pinterest: "A searchable title and a helpful description under 450 characters.",
};

// Claude's cheapest model when its key is set. MuAPI otherwise.
const writer = (actor: { workspaceId: string; userId: string }) => (prompt: string, system: string) => (claudeReady() ? askText(actor, "write", system, prompt) : generateText(prompt, system));

export const POST = guardWorkspace({ body: caption, limit: { name: "ai", max: 30, seconds: 86400 } }, async ({ user, workspace, body }) => {
  const write = writer({ workspaceId: workspace.id, userId: user.id });
  const output = await write(
    body.prompt,
    `You write social media posts for small businesses. Platform: ${body.platform}. ${GUIDES[body.platform]} Tone: ${body.tone}. ` +
      `Never invent prices, offers or facts. Reply only with JSON: {"title": string, "description": string, "tags": "comma, separated"}`
  );
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(output.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    parsed = { description: output };
  }
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");
  return { success: true, data: { title: text(parsed.title, 300), description: text(parsed.description, 10_000), tags: text(parsed.tags, 1000) } };
});
