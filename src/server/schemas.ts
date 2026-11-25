import { z } from "zod";
import { BUSINESS_TYPES, TIMEZONES } from "@/lib/onboarding";

export const PLATFORM_KEYS = ["facebook", "instagram", "x_twitter", "youtube", "tiktok", "linkedin", "threads", "pinterest"] as const;

// Public https links only. The server never fetches them.
export const mediaUrl = z
  .string()
  .trim()
  .max(2083, "That media link is too long.")
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Media must be a public https link.");

export const color = z.string().regex(/^#[0-9a-f]{6}$/i, "Choose a colour.");
const text = (max: number) => z.string().max(max, `Keep it under ${max} characters.`);
const when = z.iso.datetime({ offset: true, error: "Choose a valid date and time." }).transform((v) => new Date(v));

const override = z.object({ title: text(300).optional(), description: text(10_000).optional(), tags: text(1000).optional(), mediaUrl: mediaUrl.optional() });
const optionFields = {
  disableComment: z.boolean().optional(),
  disableDuet: z.boolean().optional(),
  disableStitch: z.boolean().optional(),
  madeForKids: z.boolean().optional(),
  categoryId: z.string().max(10).nullish(),
  privacy: z.string().max(40).optional(),
  customTag: z.string().trim().max(40).nullish(),
  tagColor: color.nullish(),
};
const accountMap = z.record(z.string().max(30), z.string().max(60)).optional();

export const createPost = z.object({
  mode: z.enum(["draft", "schedule", "now"]),
  requestKey: z.string().regex(/^[\w-]{8,60}$/).optional(),
  platforms: z.array(z.enum(PLATFORM_KEYS)).min(1, "Choose at least one platform.").max(8).transform((p) => [...new Set(p)]),
  platformAccountMap: accountMap,
  platformOverrides: z.partialRecord(z.enum(PLATFORM_KEYS), override).optional(),
  title: text(300).default(""),
  description: text(10_000).default(""),
  tags: text(1000).default(""),
  mediaUrl: mediaUrl.default(""),
  scheduledAt: when.nullish(),
  ...optionFields,
});

export const updatePost = z.object({
  mode: z.enum(["draft", "schedule"]).optional(),
  platformAccountMap: accountMap,
  title: text(300).optional(),
  description: text(10_000).optional(),
  tags: text(1000).optional(),
  mediaUrl: mediaUrl.optional(),
  scheduledAt: when.nullish(),
  action: z.literal("publish_now").optional(),
  ...optionFields,
});

export const tag = z.object({ name: z.string().trim().transform((v) => v.replace(/^#+/, "")).pipe(z.string().min(1, "Enter a tag name.").max(40, "Keep it under 40 characters.")), color: color.default("#612bd3") });

const folder = z.string().trim().min(1).max(60);
const tagList = z.union([text(300), z.array(z.string().max(40)).max(20).transform((v) => v.join(","))]);
export const createMedia = z.object({
  name: z.string().trim().min(1).max(190),
  url: mediaUrl.refine(Boolean, "Add a media link."),
  type: z.enum(["image", "video"]).default("image"),
  size: z.number().int().min(0).max(2_000_000_000).nullish(),
  width: z.number().int().min(1).max(20_000).nullish(),
  height: z.number().int().min(1).max(20_000).nullish(),
  aspectRatio: z.string().max(20).nullish(),
  folder: folder.default("All Media"),
  tags: tagList.default(""),
});
export const updateMedia = z.object({ name: z.string().trim().min(1).max(190).optional(), folder: folder.optional(), tags: tagList.optional() });

export const workspaceInput = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(60, "Keep it under 60 characters."),
  businessType: z.enum(BUSINESS_TYPES).nullish(),
  timezone: z.enum(TIMEZONES),
  emailOnFailure: z.boolean().optional(),
});

export const connect = z.object({ platform: z.enum(PLATFORM_KEYS) });
export const rename = z.object({ accountName: z.string().trim().min(1, "Enter a name.").max(80, "Keep it under 80 characters.") });

export const caption = z.object({ prompt: z.string().trim().min(1, "Describe the post.").max(2000, "Keep it under 2,000 characters."), platform: z.enum(PLATFORM_KEYS).default("facebook"), tone: z.string().trim().max(60).default("Engaging") });
export const chat = z.object({
  message: z.string().trim().min(1, "Write a message.").max(4000, "Keep it under 4,000 characters."),
  history: z.array(z.object({ role: z.string().max(20), content: z.string().max(20_000) })).max(60).default([]),
  selectedChannels: z.array(z.enum(PLATFORM_KEYS)).max(8).default([]),
  threadId: z.string().max(100).optional(),
});
