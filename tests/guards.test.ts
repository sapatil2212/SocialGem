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
  "stripe/webhook/route.ts": "switched off until M6",
};

describe("every API route", () => {
  it("finds the routes", () => expect(routes.length).toBeGreaterThan(10));
  for (const route of routes) {
    it(`${route} is guarded`, () => {
      const code = readFileSync(join(API, route), "utf8");
      if (OWN_PROTECTION[route]) return;
      const methods = code.match(/export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE)\b/g) ?? [];
      const guarded = code.match(/export const (GET|POST|PUT|PATCH|DELETE) = guard\(/g) ?? [];
      expect(methods.length).toBeGreaterThan(0);
      expect(guarded.length).toBe(methods.length);
      expect(code).not.toMatch(/@\/lib\/prisma|next-auth\/next/);
      for (const part of code.split(/export const /).slice(1)) {
        if (/^(POST|PUT|PATCH|DELETE) = guard\(\{\}/.test(part)) expect(part).toMatch(/throw new HttpError\(503/);
      }
    });
  }
});

describe("no publishing or fake data before M4", () => {
  const all = readdirSync("src", { recursive: true, encoding: "utf8" }).filter((f) => /\.(js|jsx|ts|tsx)$/.test(f)).map((f) => readFileSync(join("src", f), "utf8")).join("\n");
  it("has no publish endpoints", () => expect(all).not.toMatch(/-publish["'`]/));
  it("has no in-memory stores or dummy account", () => expect(all).not.toMatch(/DemoStore|MediaStore|SocialAccountStore|=== 101|\|\| 101/));
  it("calls MuAPI from one module only", () => expect(all.match(/api\.muapi\.ai/g)?.length).toBe(1));
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
