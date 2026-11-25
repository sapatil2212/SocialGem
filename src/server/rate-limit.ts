import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Behind Caddy the last forwarded address is the one our own proxy saw.
export function clientIp(headers: Headers | Record<string, unknown> | undefined) {
  const raw = headers instanceof Headers ? headers.get("x-forwarded-for") : headers?.["x-forwarded-for"];
  return typeof raw === "string" ? raw.split(",").pop()!.trim() || "local" : "local";
}

// Fixed window, counted atomically in the database. Returns true while under the limit.
export async function allow(name: string, limit: number, windowSeconds: number) {
  const key = createHash("sha256").update(name).digest("hex");
  await prisma.$executeRaw`
    INSERT INTO RateLimit (\`key\`, windowStart, count) VALUES (${key}, UTC_TIMESTAMP(3), 1)
    ON DUPLICATE KEY UPDATE
      count = IF(windowStart < UTC_TIMESTAMP(3) - INTERVAL ${windowSeconds} SECOND, 1, count + 1),
      windowStart = IF(count = 1, UTC_TIMESTAMP(3), windowStart)`;
  const row = await prisma.rateLimit.findUnique({ where: { key }, select: { count: true } });
  return (row?.count ?? 1) <= limit;
}
