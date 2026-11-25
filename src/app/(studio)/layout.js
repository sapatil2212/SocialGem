import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import WorkspaceProvider from "@/components/layout/WorkspaceProvider";
import { currentUser } from "@/server/guard";
import { listWorkspaces } from "@/server/workspaces";

export default async function StudioLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const all = (await listWorkspaces(user.id)).map(({ id, name }) => ({ id, name }));
  if (!all.length) redirect("/onboarding");
  // The cookie is only a preference: it must match a workspace this person belongs to.
  const wanted = (await cookies()).get("sg_ws")?.value;
  const current = all.find((w) => w.id === wanted) ?? all[0];

  return (
    <WorkspaceProvider key={current.id} current={current} all={all}>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
