import { mkdtempSync, readdirSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { localDay, localToUtc } from "../src/lib/local-time";

describe("local time", () => {
  it("turns wall clock into UTC, across clock changes", () => {
    expect(localToUtc("2026-11-30", 0, "18:30", "Asia/Kolkata").toISOString()).toBe("2026-11-30T13:00:00.000Z");
    expect(localToUtc("2026-11-30", 1, "09:00", "Asia/Kolkata").toISOString()).toBe("2026-12-01T03:30:00.000Z");
    expect(localToUtc("2027-03-13", 0, "09:00", "America/New_York").toISOString()).toBe("2027-03-13T14:00:00.000Z");
    expect(localToUtc("2027-03-13", 1, "09:00", "America/New_York").toISOString()).toBe("2027-03-14T13:00:00.000Z");
    expect(localDay(new Date("2026-11-30T20:00:00Z"), "Asia/Kolkata")).toBe("2026-12-01");
  });
});

const url = process.env.TEST_DATABASE_URL ?? "";
const local = /^mysql:\/\/[^@]+@(127\.0\.0\.1|localhost):\d+\/\w+_test/.test(url);

describe.skipIf(!local)("AI studio (local MySQL, stand-in AI)", async () => {
  if (!local) return;
  process.env.DATABASE_URL = url;
  process.env.NEXTAUTH_URL = "https://app.example.com";
  process.env.PLATFORMS_ENABLED = "facebook,instagram";
  process.env.STORAGE_PATH = mkdtempSync(join(tmpdir(), "sg-media-"));
  delete process.env.MEDIA_PUBLIC_URL;
  delete process.env.APP_URL;
  const db = new PrismaClient({ datasourceUrl: url });

  type Call = { model: string; schema: boolean; tools: boolean; body: string };
  const seen: Call[] = [];
  const gemini: { key?: string; body: string }[] = [];
  const reply = { current: (_: Call) => ({}) as unknown, image: null as unknown, stop: "end_turn", status: 200 };
  const read = async (q: IncomingMessage) => {
    let s = "";
    for await (const c of q) s += c;
    return s;
  };
  const server = createServer(async (q, r) => {
    const body = await read(q);
    if (q.url?.includes("interactions")) {
      gemini.push({ key: q.headers["x-goog-api-key"] as string, body });
      r.setHeader("content-type", "application/json");
      return r.end(JSON.stringify(reply.image));
    }
    const b = JSON.parse(body);
    const call = { model: b.model, schema: Boolean(b.output_config?.format), tools: Boolean(b.tools), body };
    seen.push(call);
    if (reply.status !== 200) {
      r.statusCode = reply.status;
      r.setHeader("content-type", "application/json");
      return r.end(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "no" } }));
    }
    const out = reply.current(call);
    const blocks = call.tools
      ? [{ type: "web_search_tool_result", tool_use_id: "srvtoolu_1", content: [{ type: "web_search_result", url: "https://rival.example/about", title: "R", encrypted_content: "x", page_age: null }, { type: "web_search_result", url: "https://news.example/trend", title: "T", encrypted_content: "x", page_age: null }] }, { type: "text", text: "Notes", citations: null }]
      : [{ type: "text", text: typeof out === "string" ? out : JSON.stringify(out), citations: null }];
    const ev = (e: string, d: object) => r.write(`event: ${e}\ndata: ${JSON.stringify({ type: e, ...d })}\n\n`);
    r.setHeader("content-type", "text/event-stream");
    const usage = { input_tokens: 1000, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
    ev("message_start", { message: { id: "m", type: "message", role: "assistant", model: b.model, content: [], stop_reason: null, stop_sequence: null, usage } });
    blocks.forEach((block, index) => {
      ev("content_block_start", { index, content_block: block.type === "text" ? { ...block, text: "" } : block });
      if (block.type === "text") ev("content_block_delta", { index, delta: { type: "text_delta", text: (block as { text: string }).text } });
      ev("content_block_stop", { index });
    });
    ev("message_delta", { delta: { stop_reason: reply.stop, stop_sequence: null }, usage: { ...usage, output_tokens: 500, server_tool_use: call.tools ? { web_search_requests: 2, web_fetch_requests: 1 } : null } });
    ev("message_stop", {});
    r.end();
  });

  let studio: typeof import("../src/server/ai/studio");
  let images: typeof import("../src/server/ai/images");
  let ws: { id: string; name: string; timezone: string; externalUserId: string; role: "OWNER" };
  let userId = "";
  const brand = { name: "Filter & Co", oneLiner: "Café", audience: "Locals", positioning: "Warm", voice: { traits: ["warm"], dos: ["short"], donts: ["shout"] }, pillars: [{ name: "Menu", description: "Food" }], colors: [{ name: "Brown", hex: "#7a4a2a", use: "main" }, { name: "Bad", hex: "red", use: "x" }], fonts: { heading: "Lora", body: "Inter" }, imageStyle: "Natural light", logoNotes: "", hashtags: ["#punecafe"], avoid: ["discounts"], facts: ["Open till 10"], assumptions: ["Colours guessed"] };
  const run = async (input: object) => {
    const started = await studio.startJob(ws, userId, studio.jobInput.parse(input));
    await started.run();
    return db.aiJob.findUniqueOrThrow({ where: { id: started.job.id } });
  };
  const outcome = (p: Promise<unknown>) => p.then(() => "ok", (e) => e.code as string);
  const makeBrand = async () => {
    reply.current = (c) => (c.schema ? brand : "Notes");
    await run({ kind: "brand", website: "filter.example", about: "Café in Pune" });
    const row = await db.brandProfile.findUniqueOrThrow({ where: { workspaceId: ws.id } });
    await studio.saveBrand(ws.id, row.data as never);
  };
  const day = () => localDay(new Date(Date.now() + 86_400_000), "Asia/Kolkata");
  const makePlan = async (platforms = ["facebook", "instagram"]) => {
    reply.current = () => ({ title: "Week", strategy: "Plan", items: [{ day: 0, time: "18:30", platforms, format: "image", pillar: "Menu", topic: "Chai", angle: "Rain" }, { day: 2, time: "03:00", platforms: ["facebook", "tiktok"], format: "text", pillar: "Menu", topic: "Toast", angle: "Crunch" }, { day: 99, time: "10:00", platforms, format: "image", pillar: "x", topic: "Outside", angle: "x" }] });
    await run({ kind: "plan", start: day(), days: 7, perWeek: 3, platforms: ["facebook", "instagram"], goal: "" });
    return db.contentPlan.findFirstOrThrow({ include: { ideas: { orderBy: { position: "asc" } } } });
  };
  const writeAll = async (plan: { id: string; ideas: { id: string }[] }) => {
    reply.current = () => ({ items: plan.ideas.map((_, ref) => ({ ref, captions: [{ platform: "facebook", text: `FB ${ref}` }, { platform: "instagram", text: `IG ${"x".repeat(3000)}` }], hashtags: ["#chai", "pune café"], imagePrompt: "A cup of chai" })) });
    return run({ kind: "write", planId: plan.id, ideaIds: plan.ideas.map((i) => i.id) });
  };
  const account = (platform: "FACEBOOK" | "INSTAGRAM") => db.socialAccount.create({ data: { workspaceId: ws.id, platform, name: platform, status: "ACTIVE" } });

  beforeAll(async () => {
    await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    process.env.ANTHROPIC_BASE_URL_TEST = base;
    process.env.GEMINI_BASE_URL_TEST = base;
    studio = await import("../src/server/ai/studio");
    images = await import("../src/server/ai/images");
  });
  const wipe = async () => {
    for (const t of ["AiUsage", "AiJob", "ContentIdea", "ContentPlan", "ContentResearch", "BrandProfile", "PublishAttempt", "PostTarget", "Post", "PostTag", "MediaAsset", "SocialAccount", "ConnectAttempt", "LedgerEntry", "WorkspaceMember", "Workspace", "BillingAccount", "VerificationToken", "RateLimit", "User"]) await db.$executeRawUnsafe("DELETE FROM " + t);
  };
  beforeEach(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    Object.assign(process.env, { ANTHROPIC_API_KEY: "test-key", GEMINI_API_KEY: "test-gemini", AI_WORKSPACE_MONTHLY_USD: "5", AI_TOTAL_DAILY_USD: "10" });
    Object.assign(reply, { stop: "end_turn", status: 200, image: null });
    seen.length = 0;
    gemini.length = 0;
    await wipe();
    const user = await db.user.create({ data: { email: "a@example.com" } });
    const billing = await db.billingAccount.create({ data: { ownerUserId: user.id } });
    const w = await db.workspace.create({ data: { name: "Café", billingAccountId: billing.id } });
    ws = { id: w.id, name: w.name, timezone: w.timezone, externalUserId: w.externalUserId, role: "OWNER" };
    userId = user.id;
  });
  afterAll(async () => {
    await wipe();
    await db.$disconnect();
    server.close();
  });

  it("builds a brand with the right models, records the cost, and waits for approval", async () => {
    await makeBrandOnly();
    expect(seen.map((c) => c.model)).toEqual(["claude-sonnet-5-5", "claude-opus-5-5"]);
    const row = await db.brandProfile.findUniqueOrThrow({ where: { workspaceId: ws.id } });
    expect(row.approvedAt).toBeNull();
    expect((row.data as typeof brand).colors.map((c) => c.hex)).toEqual(["#7a4a2a"]);
    const uses = await db.aiUsage.findMany({ orderBy: { createdAt: "asc" } });
    // 1000 in and 500 out on Sonnet plus two searches, then Opus.
    expect(uses.map((u) => Number(u.costUsd))).toEqual([0.027, 0.014]);
    expect(await outcome(studio.startJob(ws, userId, studio.jobInput.parse({ kind: "research" })))).toBe("BRAND_FIRST");
  });
  async function makeBrandOnly() {
    reply.current = (c) => (c.schema ? brand : "Notes");
    await run({ kind: "brand", website: "filter.example" });
  }

  it("keeps only research that traces to a page really returned", async () => {
    await makeBrand();
    reply.current = () => ({ competitors: [{ name: "Rival", url: "https://rival.example", platforms: ["instagram"], summary: "s", strengths: "s", gap: "g" }, { name: "Invented", url: "https://made-up.example", platforms: [], summary: "s", strengths: "s", gap: "g" }, { name: "Script", url: "javascript:alert(1)", platforms: [], summary: "", strengths: "", gap: "" }], trends: [{ platform: "instagram", topic: "Pour shots", format: "Reel", why: "w", sourceUrl: "https://news.example/trend" }, { platform: "facebook", topic: "Fake", format: "x", why: "w", sourceUrl: "https://news.example/other" }], opportunities: ["o"] });
    expect((await run({ kind: "research" })).status).toBe("DONE");
    const { data } = await db.contentResearch.findFirstOrThrow();
    expect(data).toMatchObject({ competitors: [{ name: "Rival" }], trends: [{ topic: "Pour shots" }] });
    expect((data as { competitors: unknown[]; trends: unknown[] }).competitors.length + (data as { trends: unknown[] }).trends.length).toBe(2);
    expect(seen.at(-1)!.model).toBe("claude-haiku-5-5");
  });

  it("plans inside the period, on allowed platforms, at sensible local times", async () => {
    await makeBrand();
    const plan = await makePlan();
    expect(plan.ideas.map((i) => i.topic)).toEqual(["Chai", "Toast"]);
    expect(plan.ideas[0].scheduledAt).toEqual(localToUtc(day(), 0, "18:30", "Asia/Kolkata"));
    expect(plan.ideas[1].scheduledAt).toEqual(localToUtc(day(), 2, "18:00", "Asia/Kolkata"));
    expect(plan.ideas[1].platforms).toEqual(["facebook"]);
    expect(await db.postTarget.count()).toBe(0);
  });

  it("writes with the cheapest model in one request and trims to each limit", async () => {
    await makeBrand();
    const plan = await makePlan();
    seen.length = 0;
    await writeAll(plan);
    expect(seen.map((c) => c.model)).toEqual(["claude-haiku-5-5"]);
    const idea = await db.contentIdea.findUniqueOrThrow({ where: { id: plan.ideas[0].id } });
    expect((idea.captions as Record<string, string>).instagram.length).toBe(2200);
    expect(idea.hashtags).toBe("chai, punecafé");
    expect(idea.status).toBe("READY");
  });

  it("stores a re-encoded image, charges once, and refuses bad bytes", async () => {
    await makeBrand();
    const plan = await makePlan();
    await writeAll(plan);
    const png = await sharp({ create: { width: 800, height: 1000, channels: 3, background: "#884422" } }).png().toBuffer();
    reply.image = { steps: [{ content: [{ type: "image", mime_type: "image/png", data: png.toString("base64") }] }] };
    await run({ kind: "images", planId: plan.id, ideaIds: [plan.ideas[0].id] });
    const media = await db.mediaAsset.findFirstOrThrow();
    expect(media.sourceUrl).toBe(`https://app.example.com/m/${media.objectKey}`);
    const meta = await sharp((await images.readMedia(media.objectKey!))!).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", 1080, 1350]);
    expect(Number((await db.aiUsage.findFirstOrThrow({ where: { provider: "gemini" } })).costUsd)).toBe(0.0336);
    expect(gemini[0].key).toBe("test-gemini");
    for (const name of ["../x.jpg", "..%2f.env", "abc.jpg", `${"a".repeat(32)}.png`]) expect(await images.readMedia(name)).toBeNull();
    const before = readdirSync(process.env.STORAGE_PATH!).length;
    reply.image = { output_image: { type: "image", data: Buffer.from("<svg onload=alert(1)>".repeat(20)).toString("base64") } };
    const job = await run({ kind: "images", planId: plan.id, ideaIds: [plan.ideas[0].id] });
    expect(job.status).toBe("FAILED");
    expect(readdirSync(process.env.STORAGE_PATH!).length).toBe(before);
  });

  it("schedules only what was approved and is ready, once, with clear reasons", async () => {
    await makeBrand();
    const plan = await makePlan();
    const [chai, toast] = plan.ideas;
    const go = (...list: string[]) => studio.approveAndSchedule(ws, userId, plan.id, list);
    expect((await go(chai.id)).problems[0].reason).toBe("Write this post first.");
    await writeAll(plan);
    expect((await go(chai.id)).problems[0].reason).toContain("Connect a facebook account");
    await account("FACEBOOK");
    await account("INSTAGRAM");
    expect((await go(chai.id)).problems[0].reason).toContain("needs an image");
    const media = await db.mediaAsset.create({ data: { workspaceId: ws.id, sourceUrl: "https://app.example.com/m/x.jpg", name: "x", mimeType: "image/jpeg", sizeBytes: 1, status: "READY" } });
    await db.contentIdea.update({ where: { id: chai.id }, data: { mediaId: media.id } });
    const both = await Promise.all([go(chai.id), go(chai.id)]);
    expect(both[0].scheduled + both[1].scheduled).toBe(1);
    expect(await db.post.count()).toBe(1);
    const targets = await db.postTarget.findMany({ orderBy: { platform: "asc" } });
    expect(targets.map((t) => [t.platform, t.status, t.caption?.slice(0, 2)])).toEqual([["FACEBOOK", "SCHEDULED", "FB"], ["INSTAGRAM", "SCHEDULED", "IG"]]);
    expect((await db.contentIdea.findUniqueOrThrow({ where: { id: toast.id } })).status).toBe("READY");
    expect(await outcome(studio.editIdea(ws.id, plan.id, chai.id, { hashtags: "x" }))).toBe("LOCKED");
    await db.contentIdea.update({ where: { id: toast.id }, data: { scheduledAt: new Date(Date.now() - 1000) } });
    expect((await go(toast.id)).problems[0].reason).toContain("time has passed");
  });

  it("hides one workspace's plans from another", async () => {
    await makeBrand();
    const plan = await makePlan();
    const other = { ...ws, id: "someone-else" };
    expect(await outcome(studio.getPlan(other.id, plan.id))).toBe("NOT_FOUND");
    expect(await outcome(studio.approveAndSchedule(other, userId, plan.id, [plan.ideas[0].id]))).toBe("NOT_FOUND");
    expect(await outcome(studio.editIdea(other.id, plan.id, plan.ideas[0].id, { hashtags: "x" }))).toBe("NOT_FOUND");
    expect(await outcome(studio.removeIdea(other.id, plan.id, plan.ideas[0].id))).toBe("LOCKED");
  });

  it("stops before spending past either budget", async () => {
    process.env.AI_WORKSPACE_MONTHLY_USD = "0.1";
    const job = await run({ kind: "brand", about: "Café" });
    expect([job.status, job.error, seen.length]).toEqual(["FAILED", "This workspace has used its AI budget for the month.", 0]);
    Object.assign(process.env, { AI_WORKSPACE_MONTHLY_USD: "5", AI_TOTAL_DAILY_USD: "0" });
    expect((await run({ kind: "brand", about: "Café" })).error).toContain("daily limit");
    expect(seen.length).toBe(0);
  });

  it("runs one task at a time and recovers an interrupted one", async () => {
    const two = await Promise.all([1, 2].map(() => outcome(studio.startJob(ws, userId, studio.jobInput.parse({ kind: "brand", about: "x" })))));
    expect(two.sort()).toEqual(["AI_RUNNING", "ok"]);
    await db.aiJob.updateMany({ data: { heartbeatAt: new Date(Date.now() - 10 * 60_000) } });
    expect((await studio.studioState(ws)).job).toMatchObject({ status: "FAILED" });
    expect(await outcome(studio.startJob(ws, userId, studio.jobInput.parse({ kind: "brand", about: "x" })))).toBe("ok");
  });

  it("reports refusals, bad answers and a bad key plainly", async () => {
    reply.stop = "refusal";
    expect((await run({ kind: "brand", about: "x" })).error).toContain("declined");
    // Still counted: a refused answer is billed.
    expect(await db.aiUsage.count()).toBe(1);
    reply.stop = "max_tokens";
    expect((await run({ kind: "brand", about: "x" })).error).toContain("too long");
    reply.stop = "end_turn";
    reply.current = () => "not json";
    expect((await run({ kind: "brand", about: "x" })).error).toContain("could not use");
    reply.status = 401;
    expect((await run({ kind: "brand", about: "x" })).error).toContain("key was not accepted");
  });

  it("is off without keys, and refuses private addresses", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(await outcome(studio.startJob(ws, userId, studio.jobInput.parse({ kind: "brand", about: "x" })))).toBe("AI_NOT_SET");
    for (const website of ["http://127.0.0.1", "http://localhost", "file:///etc/passwd", "https://u:p@a.com"]) expect(studio.jobInput.safeParse({ kind: "brand", website }).success).toBe(false);
  });
});
