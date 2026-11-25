import { redirect } from "next/navigation";
import AccountSettings from "@/components/dashboard/AccountSettings";
import { authError, googleReady, type Search } from "@/server/entry";
import { accountDetails } from "@/server/google";
import { currentUser } from "@/server/guard";

export const metadata = { title: "Account settings" };

export default async function Page({ searchParams }: { searchParams: Search }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const params = await searchParams;
  return <AccountSettings details={await accountDetails(user.id)} googleReady={googleReady()} error={authError(params.error)} linked={params.linked === "1"} />;
}
