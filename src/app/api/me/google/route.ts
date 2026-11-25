import { z } from "zod";
import { startGoogleLink, unlinkGoogle } from "@/server/google";
import { guard } from "@/server/guard";

// Both share one limit, so neither can be used to guess the password faster.
const options = { body: z.object({ password: z.string().min(1, "Enter your password.").max(128) }), limit: { name: "me-google", max: 8, seconds: 900 } };

export const POST = guard(options, ({ user, body }) => startGoogleLink(user.id, body.password));

export const DELETE = guard(options, ({ user, body }) => unlinkGoogle(user.id, body.password));
