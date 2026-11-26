import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError } from "../errors";
import { claudeKey as key, claudeReady } from "./ready";

// The only module that talks to Claude. Every call is budget-checked and recorded.
export { claudeReady };

/** Who is asking, so spending can be counted and limited. */
export type Actor = { workspaceId: string; userId: string; jobId?: string };

// Dollars per million tokens, checked 25 Nov 2026. Haiku prices are for prompts under 100,000 tokens.
const PRICES: Record<string, { in: number; out: number; write: number; read: number }> = {
  "claude-opus-5-5": { in: 4, out: 20, write: 5, read: 0.2 },
  "claude-sonnet-5-5": { in: 2, out: 10, write: 2.5, read: 0.1 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5, write: 0.125, read: 0.01 },
};
const SEARCH_USD = 0.01;

type Effort = "low" | "medium" | "high";
type Task = { model: string; effort: Effort; maxTokens: number; reserve: number };

// Strong models think, cheap models write. `reserve` is a cautious cost for one call.
export const TASKS = {
  strategy: { model: "claude-opus-5-5", effort: "medium", maxTokens: 24_000, reserve: 0.4 },
  research: { model: "claude-sonnet-5-5", effort: "low", maxTokens: 12_000, reserve: 0.4 },
  extract: { model: "claude-haiku-5-5", effort: "low", maxTokens: 12_000, reserve: 0.02 },
  write: { model: "claude-haiku-5-5", effort: "medium", maxTokens: 16_000, reserve: 0.02 },
} satisfies Record<string, Task>;
export type TaskName = keyof typeof TASKS;

const limit = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return process.env[name]?.trim() && Number.isFinite(value) && value >= 0 ? value : fallback;
};
export const monthlyLimit = () => limit("AI_WORKSPACE_MONTHLY_USD", 5);
const dailyLimit = () => limit("AI_TOTAL_DAILY_USD", 10);

const monthStart = () => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
const total = async (where: object) => Number((await prisma.aiUsage.aggregate({ where, _sum: { costUsd: true } }))._sum.costUsd ?? 0);
export const spentThisMonth = (workspaceId: string) => total({ workspaceId, createdAt: { gte: monthStart() } });

export async function requireBudget(workspaceId: string, reserve: number) {
  const [month, day] = await Promise.all([spentThisMonth(workspaceId), total({ createdAt: { gte: new Date(Date.now() - 86_400_000) } })]);
  if (month + reserve > monthlyLimit()) throw new HttpError(402, "AI_BUDGET", "This workspace has used its AI budget for the month.");
  if (day + reserve > dailyLimit()) throw new HttpError(503, "AI_BUSY", "AI is at its daily limit. Please try again tomorrow.");
}

type Use = { provider: string; model: string; task: string; inputTokens?: number; outputTokens?: number; cacheRead?: number; cacheWrite?: number; searches?: number; images?: number; costUsd: number };
export const recordUse = (actor: Actor, use: Use) => prisma.aiUsage.create({ data: { ...actor, jobId: actor.jobId ?? null, ...use, costUsd: use.costUsd.toFixed(6) } });

let client: Anthropic | undefined;
function claude() {
  if (!key()) throw new HttpError(503, "AI_NOT_SET", "Claude is not set up on this server yet.");
  // The key is passed on purpose, so no other login on the machine is ever used.
  return (client ??= new Anthropic({ apiKey: key(), authToken: null, baseURL: process.env.ANTHROPIC_BASE_URL_TEST || "https://api.anthropic.com", timeout: 300_000, maxRetries: 2 }));
}

type Tools = Anthropic.Beta.BetaToolUnion[];
/** A picture for Claude to look at, sent with the prompt. */
export type Picture = Anthropic.Beta.BetaImageBlockParam;
type Ask = { system: string; prompt: string; tools?: Tools; schema?: z.ZodType; pictures?: Picture[] };

export function costOf(model: string, u: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }, searches: number) {
  const p = PRICES[model] ?? PRICES["claude-opus-5-5"];
  return (u.input_tokens * p.in + u.output_tokens * p.out + (u.cache_read_input_tokens ?? 0) * p.read + (u.cache_creation_input_tokens ?? 0) * p.write) / 1e6 + searches * SEARCH_USD;
}

// Without the SDK's own parser, which throws before the cost of a refused or cut-off answer is recorded.
function shapeOf(schema: z.ZodType) {
  const { type, schema: shape } = zodOutputFormat(schema);
  return { type, schema: shape };
}

async function send(actor: Actor, name: TaskName, ask: Ask): Promise<Anthropic.Beta.BetaMessage[]> {
  const task: Task = TASKS[name];
  const content: Anthropic.Beta.BetaMessageParam["content"] = ask.pictures?.length ? [...ask.pictures, { type: "text", text: ask.prompt }] : ask.prompt;
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content }];
  const replies: Anthropic.Beta.BetaMessage[] = [];
  for (let turn = 0; turn < 3; turn++) {
    await requireBudget(actor.workspaceId, task.reserve);
    let reply: Anthropic.Beta.BetaMessage;
    try {
      reply = await claude()
        .beta.messages.stream({
          model: task.model,
          max_tokens: task.maxTokens,
          system: ask.system,
          messages,
          cache_control: ask.tools ? { type: "ephemeral" } : undefined,
          thinking: { type: "adaptive" },
          output_config: { effort: task.effort, ...(ask.schema ? { format: shapeOf(ask.schema) } : {}) },
          ...(ask.tools ? { tools: ask.tools } : {}),
          // A declined request is retried on another model by the API. Haiku has no such fallback.
          ...(task.model === "claude-haiku-5-5" ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }),
        })
        .finalMessage();
    } catch (error) {
      if (error instanceof HttpError) throw error;
      console.error("[claude]", name, error instanceof Anthropic.APIError ? error.status : (error as Error).name);
      if (error instanceof Anthropic.AuthenticationError) throw new HttpError(503, "AI_KEY", "The Claude key was not accepted.");
      if (error instanceof Anthropic.PermissionDeniedError) throw new HttpError(503, "AI_KEY", "The Claude key cannot use this model.");
      if (error instanceof Anthropic.RateLimitError) throw new HttpError(503, "AI_BUSY", "Claude is busy. Please try again in a minute.");
      if (error instanceof Anthropic.BadRequestError) throw new HttpError(502, "AI_REQUEST", "Claude could not accept that request. Check the credit balance in the Claude Console.");
      throw new HttpError(502, "AI_PROVIDER", "Claude did not respond. Please try again.");
    }
    const searches = reply.usage.server_tool_use?.web_search_requests ?? 0;
    await recordUse(actor, {
      provider: "claude", model: reply.model, task: name, inputTokens: reply.usage.input_tokens, outputTokens: reply.usage.output_tokens,
      cacheRead: reply.usage.cache_read_input_tokens ?? 0, cacheWrite: reply.usage.cache_creation_input_tokens ?? 0, searches, costUsd: costOf(reply.model, reply.usage, searches),
    });
    replies.push(reply);
    if (reply.stop_reason === "refusal") throw new HttpError(422, "AI_REFUSED", "The AI declined that request. Try describing it differently.");
    if (reply.stop_reason === "max_tokens") throw new HttpError(502, "AI_LONG", "The answer was too long. Try a smaller plan.");
    if (reply.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: reply.content as Anthropic.Beta.BetaContentBlockParam[] });
  }
  return replies;
}

const textOf = (replies: Anthropic.Beta.BetaMessage[]) => replies.flatMap((r) => r.content).flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();

/** An answer in a fixed shape, checked again here. */
export async function askJson<S extends z.ZodType>(actor: Actor, task: TaskName, system: string, prompt: string, schema: S, pictures?: Picture[]): Promise<z.infer<S>> {
  const raw = textOf(await send(actor, task, { system, prompt, schema, pictures }));
  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    throw new HttpError(502, "AI_SHAPE", "The AI sent an answer we could not use. Please try again.");
  }
}

export async function askText(actor: Actor, task: TaskName, system: string, prompt: string) {
  return textOf(await send(actor, task, { system, prompt })).slice(0, 20_000);
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

// Every web address the search and fetch tools really returned, however deeply nested.
export function seenUrls(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const item of value) seenUrls(item, found);
  else if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.url === "string" && /^(web_search_result|web_fetch_result|web_search_result_location)$/.test(String(o.type))) found.add(o.url);
    for (const item of Object.values(o)) seenUrls(item, found);
  }
  return found;
}

/** Reads the public web. Claude's servers do the fetching, never ours. */
export async function askWeb(actor: Actor, system: string, prompt: string, uses: { searches: number; pages: number }) {
  const tools: Tools = [
    { type: "web_search_20260209", name: "web_search", max_uses: uses.searches },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: uses.pages, max_content_tokens: 6_000 },
  ];
  const replies = await send(actor, "research", { system, prompt, tools });
  const urls = [...seenUrls(replies.map((r) => r.content))].filter((u) => /^https?:\/\//.test(u) && u.length < 1500);
  return { notes: textOf(replies).slice(0, 24_000), urls, hosts: new Set(urls.map(host)) };
}

export { host };
