import { Heading, Pager, Table, when } from "@/components/admin/parts";
import { adminAudit, requireAdmin } from "@/server/admin";
import type { Search } from "@/server/entry";

const NAMES: Record<string, string> = { "admin.login": "Logged in", "admin.logout": "Logged out", "admin.grant": "Made admin", "admin.revoke": "Removed admin", "user.disable": "Disabled account", "user.enable": "Enabled account" };

export default async function Page({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const { page, pages, rows } = await adminAudit(await searchParams);
  return (
    <>
      <Heading title="Audit log" text="Admin sign-ins and changes, newest first. Times are India time." />
      <Table head={["When", "Who", "What", "On"]} empty="Nothing has been recorded yet.">
        {rows.map((r) => <tr key={r.id}><td className="whitespace-nowrap">{when(r.createdAt)}</td><td>{r.actor}</td><td className="font-semibold">{NAMES[r.action] ?? r.action}</td><td>{r.target}</td></tr>)}
      </Table>
      <Pager path="/admin/audit" page={page} pages={pages} />
    </>
  );
}
