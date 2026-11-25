import { NextResponse } from "next/server";
import type { z } from "zod";
import { forgotSchema, resetSchema, signUpSchema } from "@/lib/auth-schemas";
import { register, requestReset, resetPassword, verifyEmail } from "@/server/account";
import { sameOrigin } from "@/server/guard";
import { allow, clientIp } from "@/server/rate-limit";

const fail = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  NextResponse.json({ error: { code, message, fields } }, { status });

function invalid(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[String(issue.path[0] ?? "form")] ??= issue.message;
  return fail(400, "INVALID", "Check the highlighted fields.", fields);
}

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!sameOrigin(request)) return fail(403, "ORIGIN", "This request was blocked.");
  if (Number(request.headers.get("content-length") || 0) > 8192) return fail(413, "TOO_LARGE", "That request is too large.");
  const body: unknown = await request.json().catch(() => null);

  try {
    if (!(await allow(`account-${action.slice(0, 20)}:${clientIp(request.headers)}`, 12, 900))) {
      return fail(429, "TOO_MANY", "Too many attempts. Please wait 15 minutes.");
    }
    switch (action) {
      case "signup": {
        const input = signUpSchema.safeParse(body);
        if (!input.success) return invalid(input.error);
        const result = await register(input.data);
        if (result === "exists") return fail(409, "EXISTS", "An account with this email already exists.", { email: "Already registered. Try logging in." });
        return NextResponse.json({ result }, { status: 201 });
      }
      case "forgot": {
        const input = forgotSchema.safeParse(body);
        if (!input.success) return invalid(input.error);
        // Same answer either way, and the limit is per address so nobody is flooded.
        if (await allow(`forgot:${input.data.email}`, 3, 3600)) {
          requestReset(input.data.email).catch((e: Error) => console.error("[reset]", e.message));
        }
        return NextResponse.json({ result: "sent" });
      }
      case "reset": {
        const input = resetSchema.safeParse(body);
        if (!input.success) return invalid(input.error);
        return (await resetPassword(input.data.token, input.data.password))
          ? NextResponse.json({ result: "ready" })
          : fail(400, "LINK", "This link has expired or was already used.");
      }
      case "verify": {
        const token = (body as { token?: unknown } | null)?.token;
        return typeof token === "string" && (await verifyEmail(token))
          ? NextResponse.json({ result: "ready" })
          : fail(400, "LINK", "This link has expired or was already used.");
      }
      default:
        return fail(404, "NOT_FOUND", "Not found.");
    }
  } catch (error) {
    console.error("[account]", action, (error as Error).name, (error as { code?: string }).code ?? "");
    return fail(503, "UNAVAILABLE", "We could not reach the server. Please try again.");
  }
}
