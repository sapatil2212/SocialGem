import { redirect } from "next/navigation";
import Wizard from "@/components/auth/Wizard";
import { currentUser } from "@/server/guard";
import { listWorkspaces } from "@/server/workspaces";

export const metadata = { title: "Set up your workspace" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/onboarding");
  const adding = (await searchParams).new === "1";
  if (!adding && (await listWorkspaces(user.id)).length) redirect("/app");
  return <Wizard userKey={`${user.id}${adding ? "-new" : ""}`} />;
}
