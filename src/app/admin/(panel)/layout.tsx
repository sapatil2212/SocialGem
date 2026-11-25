import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/server/admin";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function Layout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
