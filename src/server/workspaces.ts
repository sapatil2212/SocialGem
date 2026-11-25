import type { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError, isUniqueClash } from "./errors";

export type CurrentWorkspace = { id: string; name: string; timezone: string; externalUserId: string; role: MemberRole };

const MAX_WORKSPACES = 20;
const fields = { id: true, name: true, timezone: true, externalUserId: true, businessType: true, emailOnFailure: true } as const;

export async function membership(userId: string, workspaceId: string): Promise<CurrentWorkspace | null> {
  if (!workspaceId) return null;
  const row = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, workspace: { archivedAt: null } },
    select: { role: true, workspace: { select: fields } },
  });
  return row ? { ...row.workspace, role: row.role } : null;
}

export async function listWorkspaces(userId: string) {
  const rows = await prisma.workspaceMember.findMany({
    where: { userId, workspace: { archivedAt: null } },
    select: { role: true, workspace: { select: { id: true, name: true, timezone: true, businessType: true, emailOnFailure: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({ ...r.workspace, role: r.role }));
}

async function billingAccountOf(userId: string) {
  const found = await prisma.billingAccount.findUnique({ where: { ownerUserId: userId }, select: { id: true } });
  if (found) return found;
  try {
    return await prisma.billingAccount.create({ data: { ownerUserId: userId }, select: { id: true } });
  } catch (error) {
    if (!isUniqueClash(error)) throw error;
    return prisma.billingAccount.findUniqueOrThrow({ where: { ownerUserId: userId }, select: { id: true } });
  }
}

type Details = { name: string; businessType?: string | null; timezone: string; emailOnFailure?: boolean };

export async function createWorkspace(userId: string, details: Details) {
  const billing = await billingAccountOf(userId);
  return prisma.$transaction(async (tx) => {
    // Locked so that parallel requests cannot pass the limit together.
    await tx.$queryRaw`SELECT id FROM BillingAccount WHERE id = ${billing.id} FOR UPDATE`;
    if ((await tx.workspace.count({ where: { billingAccountId: billing.id, archivedAt: null } })) >= MAX_WORKSPACES) {
      throw new HttpError(400, "LIMIT", `You can have up to ${MAX_WORKSPACES} workspaces.`);
    }
    return tx.workspace.create({
      data: { ...details, billingAccountId: billing.id, members: { create: { userId, role: "OWNER" } } },
      select: { id: true, name: true, timezone: true, businessType: true, emailOnFailure: true },
    });
    // READ COMMITTED: MySQL's default would count an old snapshot after the lock.
  }, { isolationLevel: "ReadCommitted", maxWait: 10_000, timeout: 15_000 });
}

export const updateWorkspace = (id: string, details: Partial<Details>) =>
  prisma.workspace.update({ where: { id }, data: details, select: { id: true, name: true, timezone: true, businessType: true, emailOnFailure: true } });
