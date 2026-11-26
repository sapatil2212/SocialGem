import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { MemberRole } from "@prisma/client";
import type { z } from "zod";
import { authOptions } from "@/lib/auth";
import { currentAdmin } from "./admin";
import { allow } from "./rate-limit";
import { membership, type CurrentWorkspace } from "./workspaces";
import { HttpError, notFound } from "./errors";

export { HttpError, notFound };

type User = { id: string; email: string };
type Context = { params: Promise<Record<string, string>> };
type Options<B extends z.ZodType> = { body?: B; limit?: { name: string; max: number; seconds: number }; roles?: MemberRole[] };
// `request` is for routes that read a body other than JSON, such as uploads. Read it only once.
type Input<B extends z.ZodType> = { user: User; body: z.infer<B>; params: Record<string, string>; query: URLSearchParams; request: Request };

const MAX_BODY = 64 * 1024;
const WRITERS: MemberRole[] = ["OWNER", "ADMIN", "EDITOR"];

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

export async function currentUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user as User | undefined;
  return user?.id ? user : null;
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

async function run<B extends z.ZodType>(
  request: Request,
  context: Context,
  options: Options<B>,
  scope: "user" | "workspace" | "admin",
  handler: (input: Input<B> & { workspace?: CurrentWorkspace }) => Promise<unknown>
) {
  try {
    const user: User | null = scope === "admin" ? await currentAdmin() : await currentUser();
    if (!user) return fail(401, "SIGN_IN", "Please sign in.");
    const reading = request.method === "GET";
    if (!reading && !sameOrigin(request)) return fail(403, "ORIGIN", "This request was blocked.");

    const params = await context.params;
    let workspace: CurrentWorkspace | undefined;
    if (scope === "workspace") {
      workspace = (await membership(user.id, params.wid)) ?? undefined;
      // Not a member and not existing look the same.
      if (!workspace) return fail(404, "NOT_FOUND", "Not found.");
      if (!reading && !(options.roles ?? WRITERS).includes(workspace.role)) return fail(403, "ROLE", "Your role does not allow that.");
    }

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

    const result = await handler({ user, body: body as z.infer<B>, params, query: new URL(request.url).searchParams, request, workspace });
    return result instanceof Response ? result : NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.code, error.message);
    console.error("[api]", request.method, new URL(request.url).pathname, (error as Error).name, (error as { code?: string }).code ?? "");
    return fail(503, "UNAVAILABLE", "Something went wrong on our side. Please try again.");
  }
}

/** For routes that belong to the signed-in person. */
export function guard<B extends z.ZodType>(options: Options<B>, handler: (input: Input<B>) => Promise<unknown>) {
  return (request: Request, context: Context) => run(request, context, options, "user", handler);
}

/** For routes under /api/admin. Uses the admin session, never the customer one. */
export function guardAdmin<B extends z.ZodType>(options: Options<B>, handler: (input: Input<B>) => Promise<unknown>) {
  return (request: Request, context: Context) => run(request, context, options, "admin", handler);
}

/** For every route under /api/w/[wid]: also checks membership and role. */
export function guardWorkspace<B extends z.ZodType>(
  options: Options<B>,
  handler: (input: Input<B> & { workspace: CurrentWorkspace }) => Promise<unknown>
) {
  return (request: Request, context: Context) =>
    run(request, context, options, "workspace", (input) => handler(input as Input<B> & { workspace: CurrentWorkspace }));
}
