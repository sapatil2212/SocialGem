import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { LoginForm } from "@/components/auth/AuthForms";
import { authOptions } from "@/lib/auth";
import { safePath } from "@/lib/auth-schemas";
import { authError, googleReady, type Search } from "@/server/entry";

export const metadata = { title: "Log in" };

export default async function Page({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const next = safePath(params.next ?? params.callbackUrl, "/app");
  const session = await getServerSession(authOptions).catch(() => null);
  if (session?.user) redirect(typeof params.error === "string" ? `/account?error=${encodeURIComponent(params.error)}` : next);
  return <LoginForm next={next} error={authError(params.error)} google={googleReady()} done={typeof params.done === "string" ? params.done : ""} />;
}
