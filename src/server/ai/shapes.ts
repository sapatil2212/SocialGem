import { z } from "zod";

// What the AI must return. Lengths are trimmed afterwards: structured output does not enforce them.
export const brandShape = z.object({
  name: z.string(),
  oneLiner: z.string(),
  audience: z.string(),
  positioning: z.string(),
  voice: z.object({ traits: z.array(z.string()), dos: z.array(z.string()), donts: z.array(z.string()) }),
  pillars: z.array(z.object({ name: z.string(), description: z.string() })),
  colors: z.array(z.object({ name: z.string(), hex: z.string(), use: z.string() })),
  fonts: z.object({ heading: z.string(), body: z.string() }),
  imageStyle: z.string(),
  logoNotes: z.string(),
  hashtags: z.array(z.string()),
  avoid: z.array(z.string()),
  facts: z.array(z.string()),
  assumptions: z.array(z.string()),
});
export type Brand = z.infer<typeof brandShape>;

const s = (max: number) => z.string().trim().max(max);
const list = (n: number, max: number) => z.array(s(max)).max(n);
/** The same thing as edited by a person. */
export const brandInput = z.object({
  name: s(80).min(1, "Enter the brand name."),
  oneLiner: s(200),
  audience: s(600),
  positioning: s(600),
  voice: z.object({ traits: list(8, 60), dos: list(10, 160), donts: list(10, 160) }),
  pillars: z.array(z.object({ name: s(60), description: s(300) })).max(8),
  colors: z.array(z.object({ name: s(40), hex: z.string().regex(/^#[0-9a-f]{6}$/i, "Use a colour like #6D28D9."), use: s(100) })).max(8),
  fonts: z.object({ heading: s(60), body: s(60) }),
  imageStyle: s(600),
  logoNotes: s(400),
  hashtags: list(20, 40),
  avoid: list(12, 160),
  facts: list(20, 200),
  assumptions: list(20, 200),
});

const cut = (v: string, n: number) => v.trim().slice(0, n);
const cuts = (v: string[], n: number, max: number) => v.map((x) => cut(x, max)).filter(Boolean).slice(0, n);
const tag = (v: string) => v.replace(/[^\p{L}\p{N}_]/gu, "");

export function tidyBrand(b: Brand): Brand {
  return {
    name: cut(b.name, 80) || "My brand", oneLiner: cut(b.oneLiner, 200), audience: cut(b.audience, 600), positioning: cut(b.positioning, 600),
    voice: { traits: cuts(b.voice.traits, 8, 60), dos: cuts(b.voice.dos, 10, 160), donts: cuts(b.voice.donts, 10, 160) },
    pillars: b.pillars.slice(0, 8).map((p) => ({ name: cut(p.name, 60), description: cut(p.description, 300) })),
    colors: b.colors.filter((c) => /^#[0-9a-f]{6}$/i.test(c.hex)).slice(0, 8).map((c) => ({ name: cut(c.name, 40), hex: c.hex, use: cut(c.use, 100) })),
    fonts: { heading: cut(b.fonts.heading, 60), body: cut(b.fonts.body, 60) },
    imageStyle: cut(b.imageStyle, 600), logoNotes: cut(b.logoNotes, 400), hashtags: cuts(b.hashtags.map(tag), 20, 40), avoid: cuts(b.avoid, 12, 160), facts: cuts(b.facts, 20, 200), assumptions: cuts(b.assumptions, 20, 200),
  };
}

export const researchShape = z.object({
  competitors: z.array(z.object({ name: z.string(), url: z.string(), platforms: z.array(z.string()), summary: z.string(), strengths: z.string(), gap: z.string() })),
  trends: z.array(z.object({ platform: z.string(), topic: z.string(), format: z.string(), why: z.string(), sourceUrl: z.string() })),
  opportunities: z.array(z.string()),
});
export type Research = z.infer<typeof researchShape>;

export const planShape = z.object({
  title: z.string(),
  strategy: z.string(),
  items: z.array(z.object({ day: z.number(), time: z.string(), platforms: z.array(z.string()), format: z.enum(["image", "text"]), pillar: z.string(), topic: z.string(), angle: z.string() })),
});

export const writeShape = z.object({
  items: z.array(z.object({ ref: z.number(), captions: z.array(z.object({ platform: z.string(), text: z.string() })), hashtags: z.array(z.string()), imagePrompt: z.string() })),
});

export const tidyTags = (tags: string[], n: number) => [...new Set(tags.map(tag).filter(Boolean))].slice(0, n).join(", ").slice(0, 1000);

// What each platform accepts, in characters.
export const CAPTION_MAX: Record<string, number> = { facebook: 2000, instagram: 2200, x_twitter: 280, linkedin: 3000, threads: 500, youtube: 4500, tiktok: 150, pinterest: 500 };
