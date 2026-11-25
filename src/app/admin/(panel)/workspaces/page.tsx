import { Badge, Heading, Pager, SearchBar, Table, when } from "@/components/admin/parts";
import { adminWorkspaces, requireAdmin } from "@/server/admin";
import type { Search } from "@/server/entry";

export default async function Page({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const { q, page, pages, total, rows } = await adminWorkspaces(await searchParams);
  return (
    <>
      <Heading title="Workspaces" text={`${total.toLocaleString("en-IN")} in total`} />
      <SearchBar q={q} label="Search workspace name" />
      <Table head={["Workspace", "Owner", "Members", "Channels", "Posts", "Created"]} empty="No workspaces match that search.">
        {rows.map((w) => (
          <tr key={w.id}>
            <td><b className="font-semibold">{w.name}</b> {w.archivedAt && <Badge tone="warn">Archived</Badge>}<span className="block text-muted-ink">{w.timezone}</span></td>
            <td>{w.members[0]?.user.email ?? "None"}</td>
            <td className="tabular-nums">{w._count.members}</td><td className="tabular-nums">{w._count.accounts}</td><td className="tabular-nums">{w._count.posts}</td>
            <td className="whitespace-nowrap">{when(w.createdAt)}</td>
          </tr>
        ))}
      </Table>
      <Pager path="/admin/workspaces" page={page} pages={pages} q={q} />
    </>
  );
}
