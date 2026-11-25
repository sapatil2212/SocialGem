import { NextResponse } from "next/server";
import type { z } from "zod";
import { forgotSchema, resendSchema, resetSchema, signInSchema, signUpSchema, verifySchema } from "@/lib/auth-schemas";
import { challenge, register, requestReset, resend, resetPassword, verifyEmail } from "@/server/account";
import { HttpError } from "@/server/errors";
import { sameOrigin } from "@/server/guard";
import { allow, clientIp } from "@/server/rate-limit";

const fail = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  NextResponse.json({ error: { code, message, fields } }, { status, headers: { "Cache-Control": "no-store" } });

function parse<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> | NextResponse {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) fields[String(issue.path[0] ?? "form")] ??= issue.message;
  return fail(400, "INVALID", "Check the highlighted fields.", fields);
}

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!sameOrigin(request)) return fail(403, "ORIGIN", "This request was blocked.");
  if (Number(request.headers.get("content-length") || 0) > 8192) return fail(413, "TOO_LARGE", "That request is too large.");
  const body: unknown = await request.json().catch(() => null);
  const ip = clientIp(request.headers);
  const done = (data: object) => NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });

  try {
    if (!(await allow(`account-${action.slice(0, 20)}:${ip}`, 30, 900))) return fail(429, "TOO_MANY", "Too many attempts. Please wait 15 minutes.");
    switch (action) {
      case "signup": {
        const input = parse(signUpSchema, body);
        return input instanceof NextResponse ? input : done({ result: "code", pending: await register(input) });
      }
      case "challenge": {
        const input = parse(signInSchema, body);
        if (input instanceof NextResponse) return input;
        // Counts with log in, so it cannot be used to guess passwords faster.
        if (!(await allow(`login:${ip}:${input.email}`, 8, 900)) || !(await allow(`login-email:${input.email}`, 60, 900))) return fail(429, "TOO_MANY", "Too many attempts. Please wait 15 minutes.");
        return done({ result: "code", pending: await challenge(input.email, input.password) });
      }
      case "verify": {
        const input = parse(verifySchema, body);
        if (input instanceof NextResponse) return input;
        await verifyEmail(input.pending, input.code);
        return done({ result: "ready" });
      }
      case "resend": {
        const input = parse(resendSchema, body);
        return input instanceof NextResponse ? input : done({ result: "code", pending: await resend(input.purpose, input.pending) });
      }
      case "forgot": {
        const input = parse(forgotSchema, body);
        return input instanceof NextResponse ? input : done({ result: "code", pending: await requestReset(input.email) });
      }
      case "reset": {
        const input = parse(resetSchema, body);
        if (input instanceof NextResponse) return input;
        await resetPassword(input.pending, input.code, input.password);
        return done({ result: "ready" });
      }
      default:
        return fail(404, "NOT_FOUND", "Not found.");
    }
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.code, error.message);
    console.error("[account]", action, (error as Error).name, (error as { code?: string }).code ?? "");
    return fail(503, "UNAVAILABLE", "We could not reach the server. Please try again.");
  }
}
