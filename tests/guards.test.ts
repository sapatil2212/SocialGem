import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createMedia, createPost, updatePost } from "../src/server/schemas";
import { emailSchema, passwordSchema, safePath } from "../src/lib/auth-schemas";

const API = "src/app/api";
const routes = readdirSync(API, { recursive: true, encoding: "utf8" })
  .map((f) => f.replace(/\\/g, "/"))
  .filter((f) => /route\.(js|ts)$/.test(f));

// Each needs its own protection; add here only with a reason.
const OWN_PROTECTION: Record<string, string> = {
  "auth/[...nextauth]/route.js": "NextAuth",
  "account/[action]/route.ts": "public by design: origin check, zod and rate limits",
  "admin/auth/[action]/route.ts": "admin sign-in: origin check, zod, rate limits",
  "stripe/webhook/route.ts": "switched off until M6",
  "social/x/callback/route.ts": "OAuth return from X: signed-in user, single-use state tied to that user",
};

describe("every API route", () => {
  it("finds the routes", () => expect(routes.length).toBeGreaterThan(10));
  for (const route of routes) {
    it(`${route} is guarded`, () => {
      if (route.startsWith("w/")) expect(readFileSync(join(API, route), "utf8")).not.toMatch(/= guard\(/);
      const code = readFileSync(join(API, route), "utf8");
      if (route.startsWith("admin/") && !OWN_PROTECTION[route]) expect(code).not.toMatch(/= guard(?:Workspace)?\(/);
      if (OWN_PROTECTION[route]) return;
      const methods = code.match(/export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE)\b/g) ?? [];
      const guarded = code.match(/export const (GET|POST|PUT|PATCH|DELETE) = guard(?:Workspace|Admin)?\(/g) ?? [];
      expect(methods.length).toBeGreaterThan(0);
      expect(guarded.length).toBe(methods.length);
      expect(code).not.toMatch(/@\/lib\/prisma|next-auth\/next/);
      for (const part of code.split(/export const /).slice(1)) {
        if (/^(POST|PUT|PATCH|DELETE) = guard(?:Workspace)?\(\{\}/.test(part)) expect(part).toMatch(/throw new HttpError\(503/);
      }
    });
  }
});

describe("admin pages", () => {
  const base = "src/app/admin/(panel)";
  const pages = readdirSync(base, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith("page.tsx"));
  it("finds the pages", () => expect(pages.length).toBe(4));
  // Layouts are not re-run on navigation, so each page checks for itself.
  it.each(pages)("%s checks the admin session", (f) => expect(readFileSync(join(base, f), "utf8")).toMatch(/await requireAdmin\(\)/));
});

describe("no publishing or fake data before M4", () => {
  const all = readdirSync("src", { recursive: true, encoding: "utf8" }).filter((f) => /\.(js|jsx|ts|tsx)$/.test(f)).map((f) => readFileSync(join("src", f), "utf8")).join("\n");
  it("has no publish endpoints", () => expect(all).not.toMatch(/-publish["'`]/));
  it("has no in-memory stores or dummy account", () => expect(all).not.toMatch(/DemoStore|MediaStore|SocialAccountStore|=== 101|\|\| 101/));
  it("calls MuAPI from one module only", () => expect(all.match(/api\.muapi\.ai/g)?.length).toBe(1));
  it("calls X from one module only", () => expect(all.match(/api\.x\.com/g)?.length).toBe(1));
  // Its disconnect removed every Page on a Facebook login (26 Nov 2026). We switch channels off ourselves.
  it("never asks MuAPI to disconnect or delete an account", () => {
    const muapi = readFileSync("src/server/muapi.ts", "utf8");
    expect(muapi).not.toMatch(/\/disconnect|method: "DELETE"/);
  });
});

describe("input rules", () => {
  const base = { mode: "draft", platforms: ["facebook"] };
  it.each(["http://a.com/x.png", "javascript:alert(1)", "data:image/png;base64,AAAA", "blob:https://a/b", "https://u:p@a.com/x", "file:///etc/passwd"])("refuses media link %s", (mediaUrl) => {
    expect(createPost.safeParse({ ...base, mediaUrl }).success).toBe(false);
    expect(createMedia.safeParse({ name: "x", url: mediaUrl }).success).toBe(false);
  });
  it("accepts a public link and an empty one", () => {
    expect(createPost.safeParse({ ...base, mediaUrl: "https://cdn.example.com/a.png" }).success).toBe(true);
    expect(createPost.safeParse(base).success).toBe(true);
  });
  it("drops fields that must not be set by clients", () => {
    const parsed = updatePost.parse({ title: "x", userId: "other", status: "completed", publishedUrl: "x", accountId: 5 });
    expect(Object.keys(parsed)).toEqual(["title"]);
  });
  it("requires a mode and a known platform", () => {
    expect(createPost.safeParse({ platforms: ["facebook"] }).success).toBe(false);
    expect(createPost.safeParse({ ...base, platforms: ["myspace"] }).success).toBe(false);
  });
  it("keeps redirects on this site", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "/\t/evil.com", undefined]) expect(safePath(bad)).toBe("/app");
    expect(safePath("/onboarding")).toBe("/onboarding");
  });
  it("normalises email and refuses look-alikes", () => {
    expect(emailSchema.parse(" Asha@Shop.COM ")).toBe("asha@shop.com");
    expect(emailSchema.safeParse("victím@gmail.com").success).toBe(false);
  });
  it("refuses weak passwords", () => {
    for (const p of ["short1", "aaaaaaaaaaaa", "password123"]) expect(passwordSchema.safeParse(p).success).toBe(false);
  });
});

describe("platform rules", async () => {
  const { mediaProblem, platformStates } = await import("../src/server/muapi");
  it("needs video and a title where the platform does", () => {
    expect(mediaProblem("youtube", "https://cdn.example.com/a.jpg", "Hi")).toContain("video");
    expect(mediaProblem("youtube", "https://cdn.example.com/a.mp4", "")).toContain("title");
    expect(mediaProblem("youtube", "https://cdn.example.com/a.mp4", "x".repeat(101))).toContain("100");
    expect(mediaProblem("youtube", "https://cdn.example.com/a.MP4?v=1", "Launch")).toBe("");
    expect(mediaProblem("tiktok", "", "")).toContain("video");
    expect(mediaProblem("tiktok", "https://cdn.example.com/a.mov", "")).toBe("");
    expect(mediaProblem("instagram", "", "")).toContain("Instagram");
    expect(mediaProblem("facebook", "", "")).toBe("");
  });
  it("never offers platforms that would connect to our own shared account", () => {
    const saved = process.env.PLATFORMS_ENABLED;
    process.env.PLATFORMS_ENABLED = "facebook,instagram,youtube,tiktok,x,linkedin,threads,pinterest";
    const states = platformStates();
    for (const p of ["linkedin", "threads", "pinterest"]) expect(states[p]).not.toBe("ready");
    process.env.PLATFORMS_ENABLED = saved;
  });
});

describe("AI studio ideas are always scoped", () => {
  const code = readFileSync("src/server/ai/studio.ts", "utf8");
  const calls = code.match(/contentIdea\.\w+\(\{[^]*?\}\)/g) ?? [];
  it("finds the queries", () => expect(calls.length).toBeGreaterThan(8));
  // Every query names the workspace itself, not only through the plan.
  it.each(calls.map((c) => [c.slice(0, 70), c]))("%s", (_label, call) => expect(call).toMatch(/where: \{ workspaceId(: workspace\.id)?,/));
});
