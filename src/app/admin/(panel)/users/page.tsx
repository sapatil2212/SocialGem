import UserAction from "@/components/admin/UserAction";
import { Badge, Heading, Pager, SearchBar, Table, when } from "@/components/admin/parts";
import { adminUsers, requireAdmin } from "@/server/admin";
import type { Search } from "@/server/entry";

export default async function Page({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const { q, page, pages, total, rows } = await adminUsers(await searchParams);
  return (
    <>
      <Heading title="Users" text={`${total.toLocaleString("en-IN")} ${total === 1 ? "account" : "accounts"}`} />
      <SearchBar q={q} label="Search name or email" />
      <Table head={["Person", "Status", "Workspaces", "Joined", "Action"]} empty="No users match that search.">
        {rows.map((u) => (
          <tr key={u.id}>
            <td><b className="block font-semibold">{u.name || "No name"}</b><span className="text-muted-ink">{u.email}</span></td>
            <td><span className="flex flex-wrap gap-1.5">{u.isSuperAdmin && <Badge tone="plain">Admin</Badge>}{u.disabledAt ? <Badge tone="bad">Disabled</Badge> : u.emailVerified ? <Badge tone="good">Confirmed</Badge> : <Badge tone="warn">Not confirmed</Badge>}</span></td>
            <td className="tabular-nums">{u._count.memberships}</td>
            <td className="whitespace-nowrap">{when(u.createdAt)}</td>
            <td>{u.isSuperAdmin ? <span className="text-muted-ink">Protected</span> : <UserAction id={u.id} email={u.email ?? "This account"} disabled={Boolean(u.disabledAt)} />}</td>
          </tr>
        ))}
      </Table>
      <Pager path="/admin/users" page={page} pages={pages} q={q} />
    </>
  );
}
