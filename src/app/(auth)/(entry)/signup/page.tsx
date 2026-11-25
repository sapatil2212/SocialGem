import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { SignUpForm } from "@/components/auth/AuthForms";
import { authOptions } from "@/lib/auth";
import { safePath } from "@/lib/auth-schemas";
import { authError, googleReady, type Search } from "@/server/entry";

export const metadata = { title: "Sign up" };

export default async function Page({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const next = safePath(params.next ?? params.callbackUrl, "/app");
  const session = await getServerSession(authOptions).catch(() => null);
  if (session?.user) redirect(next);
  return <SignUpForm next={next} error={authError(params.error)} google={googleReady()} />;
}
