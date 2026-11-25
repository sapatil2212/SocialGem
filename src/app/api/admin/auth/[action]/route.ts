import { NextResponse } from "next/server";
import { signInSchema } from "@/lib/auth-schemas";
import { adminLogin, endAdminSession } from "@/server/admin";
import { HttpError } from "@/server/errors";
import { sameOrigin } from "@/server/guard";
import { allow, clientIp } from "@/server/rate-limit";

const reply = (status: number, data: object) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
const fail = (status: number, code: string, message: string) => reply(status, { error: { code, message } });

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!sameOrigin(request)) return fail(403, "ORIGIN", "This request was blocked.");
  if (Number(request.headers.get("content-length") || 0) > 8192) return fail(413, "TOO_LARGE", "That request is too large.");

  try {
    if (action === "logout") {
      await endAdminSession();
      return reply(200, { result: "done" });
    }
    const ip = clientIp(request.headers);
    const busy = () => fail(429, "TOO_MANY", "Too many attempts. Please wait 15 minutes.");
    if (!(await allow(`admin-ip:${ip}`, 20, 900))) return busy();
    const body: unknown = await request.json().catch(() => null);

    if (action === "login") {
      const input = signInSchema.safeParse(body);
      if (!input.success) return fail(400, "INVALID", "Enter a valid email and password.");
      const { email, password } = input.data;
      if (!(await allow(`admin-login:${ip}:${email}`, 5, 900)) || !(await allow(`admin-email:${email}`, 30, 900))) return busy();
      await adminLogin(email, password);
      return reply(200, { result: "ready" });
    }
    return fail(404, "NOT_FOUND", "Not found.");
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.code, error.message);
    console.error("[admin]", action.slice(0, 20), (error as Error).name, (error as { code?: string }).code ?? "");
    return fail(503, "UNAVAILABLE", "We could not reach the server. Please try again.");
  }
}
