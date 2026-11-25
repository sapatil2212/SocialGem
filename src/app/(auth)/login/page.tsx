import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { CalendarCheck, ShieldCheck, SlidersHorizontal } from "lucide-react";
import Logo from "@/components/site/Logo";
import LoginForm from "@/components/auth/LoginForm";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "Log in" };

const BENEFITS = [
  { Icon: SlidersHorizontal, text: "One post, shaped for each platform" },
  { Icon: CalendarCheck, text: "A whole month on one calendar" },
  { Icon: ShieldCheck, text: "Built never to publish the same post twice" },
];

const ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "That email already signs in another way. Use the method you used first.",
  AccessDenied: "Access was not granted. Try again, or use another Google account.",
  Configuration: "Sign-in is not set up correctly on this server.",
};

// Same-origin paths only, so a crafted link cannot send people to another site.
function safePath(value: string | string[] | undefined) {
  const path = typeof value === "string" ? value : "";
  return /^\/(?![/\\])[^\s\\]*$/.test(path) ? path : "/app";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safePath(params.next ?? params.callbackUrl);
  const session = await getServerSession(authOptions);
  if (session?.user) redirect(next);

  const code = typeof params.error === "string" ? params.error : "";
  const error = code ? ERRORS[code] || "We could not sign you in. Please try again." : "";
  const ready = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-navy p-14 text-white lg:flex lg:flex-col">
        <div aria-hidden className="absolute -top-32 -right-24 size-[30rem] rounded-full bg-[#ff6b00]/35 blur-[110px]" />
        <div aria-hidden className="absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-[#cc2200]/30 blur-[110px]" />
        <Link href="/" className="relative w-fit" aria-label="SocialGem home"><Logo /></Link>
        <div className="relative my-auto">
          <h2 className="max-w-md text-5xl">Post like you have <em className="accent text-[#ffb27a]">a whole team</em></h2>
          <ul className="mt-12 grid gap-5 text-lg">
            {BENEFITS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-4">
                <span className="glass-dark grid size-11 place-items-center rounded-xl"><Icon aria-hidden className="size-5 text-[#ff9a4d]" /></span>{text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="flex flex-col px-6 py-8 sm:px-14">
        <Link href="/" className="w-fit lg:invisible" aria-label="SocialGem home"><Logo /></Link>
        <div className="m-auto w-full max-w-sm py-12">
          <h1 className="text-4xl">Log in or sign up</h1>
          <p className="mt-4 text-muted-ink">New here? Signing in creates your account.</p>
          <LoginForm next={next} error={error} ready={ready} />
          <p className="mt-8 text-sm text-muted-ink">
            SocialGem is in development. See the draft <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
