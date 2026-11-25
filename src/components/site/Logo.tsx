/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

// The supplied logos, trimmed to their artwork. Originals are in public/images/logo.
export default function Logo({ tone = "light", className }: { tone?: "light" | "dark" | "auto"; className?: string }) {
  const size = cn("h-11 w-auto max-w-none", className);
  if (tone !== "auto") return <img src={`/brand/logo-${tone}.webp`} alt="SocialGem" width={734} height={200} className={size} />;
  return (
    <>
      <img src="/brand/logo-light.webp" alt="SocialGem" width={734} height={200} className={cn(size, "dark:hidden")} />
      <img src="/brand/logo-dark.webp" alt="SocialGem" width={733} height={200} className={cn(size, "hidden dark:block")} />
    </>
  );
}

export function Mark({ className }: { className?: string }) {
  return <img src="/brand/mark.webp" alt="" width={192} height={192} className={cn("size-9", className)} />;
}
