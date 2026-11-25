import { z } from "zod";

export const BUSINESS_TYPES = ["Shop or café", "Clinic", "Freelancer", "Agency", "Other"] as const;
export const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "Australia/Sydney"] as const;
export const CHANNELS = ["facebook", "instagram"] as const;

// Shared by the wizard and, from M2, the server.
export const workspaceSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(60, "Keep it under 60 characters."),
  type: z.enum(BUSINESS_TYPES, { error: "Choose the closest match." }),
  timezone: z.enum(TIMEZONES, { error: "Choose a time zone." }),
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const draftSchema = z.object({
  step: z.number().int().min(0).max(3),
  workspace: workspaceSchema.nullable(),
  channels: z.array(z.enum(CHANNELS)),
  emailOnFailure: z.boolean(),
});
export type Draft = z.infer<typeof draftSchema>;

export const EMPTY_DRAFT: Draft = { step: 0, workspace: null, channels: [], emailOnFailure: true };
