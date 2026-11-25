import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { z } from "zod";
import { authOptions } from "@/lib/auth";
import { allow } from "./rate-limit";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const notFound = () => new HttpError(404, "NOT_FOUND", "Not found.");

type User = { id: string; email: string };
type Context = { params: Promise<Record<string, string>> };
type Options<B extends z.ZodType> = { body?: B; limit?: { name: string; max: number; seconds: number } };
type Input<B extends z.ZodType> = { user: User; body: z.infer<B>; params: Record<string, string>; query: URLSearchParams };

const MAX_BODY = 64 * 1024;

const fail = (status: number, code: string, error: string, fields?: Record<string, string>) =>
  NextResponse.json({ error, code, fields }, { status, headers: { "Cache-Control": "no-store" } });

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  try {
    return Boolean(origin) && new URL(origin!).host === request.headers.get("host");
  } catch {
    return false;
  }
}

async function readJson(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY) throw new HttpError(413, "TOO_LARGE", "That request is too large.");
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError(413, "TOO_LARGE", "That request is too large.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, "INVALID", "The request was not valid.");
  }
}

/** Every API route goes through here: session, origin, size, limits, validation and safe errors. */
export function guard<B extends z.ZodType>(options: Options<B>, handler: (input: Input<B>) => Promise<unknown>) {
  return async (request: Request, context: Context) => {
    try {
      const session = await getServerSession(authOptions);
      const user = session?.user as User | undefined;
      if (!user?.id) return fail(401, "SIGN_IN", "Please sign in.");
      if (request.method !== "GET" && !sameOrigin(request)) return fail(403, "ORIGIN", "This request was blocked.");

      const { limit } = options;
      if (limit && !(await allow(`${limit.name}:${user.id}`, limit.max, limit.seconds))) {
        return fail(429, "TOO_MANY", "Too many requests. Please try again later.");
      }

      let body: unknown;
      if (options.body) {
        const parsed = options.body.safeParse(await readJson(request));
        if (!parsed.success) {
          const fields: Record<string, string> = {};
          for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] ??= issue.message;
          return fail(400, "INVALID", Object.values(fields)[0], fields);
        }
        body = parsed.data;
      }

      const result = await handler({ user, body: body as z.infer<B>, params: await context.params, query: new URL(request.url).searchParams });
      return result instanceof Response ? result : NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof HttpError) return fail(error.status, error.code, error.message);
      console.error("[api]", request.method, new URL(request.url).pathname, (error as Error).name, (error as { code?: string }).code ?? "");
      return fail(503, "UNAVAILABLE", "Something went wrong on our side. Please try again.");
    }
  };
}
