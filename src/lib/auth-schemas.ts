import { z } from "zod";

// Shared by the forms and the server. ASCII-only email avoids look-alike accounts.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(190, "That email is too long.")
  .regex(/^[\x21-\x7e]+$/, "Enter a valid email.")
  .pipe(z.email("Enter a valid email."));

const COMMON = new Set(["password12", "1234567890", "qwertyuiop", "password123", "iloveyou12", "1q2w3e4r5t", "india12345"]);

export const PASSWORD_RULES = [
  { label: "10 or more characters", test: (v: string) => v.length >= 10 },
  { label: "A letter", test: (v: string) => /\p{L}/u.test(v) },
  { label: "A number or symbol", test: (v: string) => /[^\p{L}\s]/u.test(v) },
];

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use 128 characters or fewer.")
  .refine((v) => PASSWORD_RULES.every((r) => r.test(v)), "Include a letter and a number or symbol.")
  .refine((v) => !COMMON.has(v.toLowerCase()), "That password is too common.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128, "That password is too long."),
});
export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80, "Keep it under 80 characters."),
  email: emailSchema,
  password: passwordSchema,
});
export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z.object({ token: z.string().regex(/^[\w-]{43}$/), password: passwordSchema });

export type SignIn = z.infer<typeof signInSchema>;
export type SignUp = z.infer<typeof signUpSchema>;

// Same-origin paths only, so a crafted link cannot send people to another site.
export function safePath(value: unknown, fallback = "/app") {
  return typeof value === "string" && /^\/(?![/\\])[^\s\\]*$/.test(value) ? value : fallback;
}
