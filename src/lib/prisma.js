import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

// Without these, a silently dropped connection would hang a request for ever.
function withTimeouts(value) {
  if (!value) return undefined;
  const url = new URL(value);
  for (const [name, seconds] of [["connect_timeout", "8"], ["pool_timeout", "10"], ["socket_timeout", "12"], ["max_idle_connection_lifetime", "45"]]) {
    if (!url.searchParams.has(name)) url.searchParams.set(name, seconds);
  }
  return url.toString();
}

/** @type {PrismaClient} */
export const prisma =
  globalForPrisma.prisma || new PrismaClient({ datasourceUrl: withTimeouts(process.env.DATABASE_URL), log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
