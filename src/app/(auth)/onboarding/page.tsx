import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import Wizard from "@/components/auth/Wizard";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "Set up your workspace" };

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?next=/onboarding");
  const { id } = session.user as { id?: string };
  return <Wizard userKey={id || "local"} />;
}
