"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { Menu, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Logo from "./Logo";

const LINKS = [
  ["/#features", "Features"],
  ["/#make", "Composer"],
  ["/pricing", "Pricing"],
  ["/help", "Help"],
  ["/about", "About"],
  ["/contact", "Contact"],
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-xl backdrop-saturate-150">
      <div className="container-1280 flex h-[72px] items-center gap-2.5">
        <Link href="/" aria-label="SocialGem home" className="mr-auto lg:mr-0"><Logo className="-ml-1 max-sm:h-9" /></Link>
        <nav aria-label="Main" className="mx-auto hidden gap-0.5 lg:flex">
          {LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cn("relative flex min-h-11 items-center rounded-lg px-3.5 hover:text-brand-ink", pathname === href && "font-semibold")}
            >
              {label}
              {pathname === href && <motion.span layoutId="nav" className="absolute inset-x-3.5 bottom-1 h-0.5 bg-brand" />}
            </Link>
          ))}
        </nav>
        <Button asChild variant="outline" className="hidden sm:inline-flex"><Link href="/login">Log in</Link></Button>
        <Button asChild className="shimmer max-sm:px-3.5"><Link href="/signup">Get started</Link></Button>

        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="grid size-11 cursor-pointer place-items-center rounded-lg lg:hidden" aria-label="Open menu">
            <Menu className="size-6" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/40 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in motion-reduce:animate-none" />
            <Dialog.Content
              aria-describedby={undefined}
              className="brand fixed inset-y-0 right-0 z-50 flex w-[min(320px,88vw)] flex-col border-l border-hairline p-5 duration-300 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right motion-reduce:animate-none"
            >
              <div className="mb-4 flex items-center justify-between">
                <Dialog.Title asChild><span><Logo /></span></Dialog.Title>
                <Dialog.Close className="grid size-11 cursor-pointer place-items-center rounded-lg" aria-label="Close menu"><X className="size-6" /></Dialog.Close>
              </div>
              <nav aria-label="Mobile" className="grid">
                {[...LINKS, ["/login", "Log in"], ["/signup", "Sign up"]].map(([href, label]) => (
                  <Link key={href} href={href} onClick={() => setOpen(false)} className="flex min-h-13 items-center border-b border-hairline text-lg font-medium">
                    {label}
                  </Link>
                ))}
              </nav>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}
