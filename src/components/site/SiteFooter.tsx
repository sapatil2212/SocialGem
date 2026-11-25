import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { COMPANY, COMPANY_LINKS, telHref } from "@/content/company";
import { BackToTop, CopyEmail, FooterStage, Wordmark } from "./FooterEffects";
import Logo from "./Logo";

const PRODUCT = [
  ["/#features", "Features"],
  ["/#make", "Composer"],
  ["/#reliability", "Reliability"],
  ["/#platforms", "Platforms"],
  ["/help", "Help centre"],
  ["/data-deletion", "Data deletion"],
] as const;

export function ContactStack() {
  if (!COMPANY.whatsapp) return null;
  return (
    <a
      href={`https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent("Hello, I have a question about SocialGem.")}`}
      aria-label="Chat on WhatsApp"
      className="glass fixed right-4 bottom-4 z-30 grid size-12 place-items-center rounded-full hover:border-brand"
    >
      <FaWhatsapp className="size-5" />
    </a>
  );
}

function Column({ title, links }: { title: string; links: readonly (readonly [string, string])[] }) {
  return (
    <nav aria-label={title} className="grid content-start">
      <strong className="mb-3 text-white">{title}</strong>
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="group flex min-h-11 w-fit items-center gap-1 text-white/70 transition-colors hover:text-white sm:min-h-9">
          <span className="bg-[linear-gradient(90deg,#22d3ee,#e879f9)] bg-[length:0%_1.5px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_1.5px] group-focus-visible:bg-[length:100%_1.5px]">{label}</span>
          <ArrowUpRight aria-hidden className="size-3.5 -translate-x-1 translate-y-1 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
        </Link>
      ))}
    </nav>
  );
}

const contactItem = "flex items-center gap-3 text-white/75 hover:text-white";
const contactIcon = "grid size-10 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/6 text-[#8be9ff]";

export default function SiteFooter() {
  return (
    <FooterStage>
      <div className="container-1280 relative grid gap-12 pt-20 pb-14 md:grid-cols-2 lg:grid-cols-[1.2fr_0.65fr_0.85fr_1.35fr]">
        <div>
          <Link href="/" aria-label="SocialGem home" className="inline-block"><Logo tone="dark" className="-ml-2 h-14" /></Link>
          <p className="mt-5 max-w-xs text-white/70">Plan, create and schedule your social posts from one calm workspace. Made in India for growing businesses.</p>
          <Link href="/signup" className="shimmer mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-navy">
            Create your workspace <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        </div>
        <Column title="Product" links={PRODUCT} />
        <Column title="Company" links={COMPANY_LINKS} />
        <address className="grid content-start gap-4 not-italic">
          <strong className="text-white">Contact Us</strong>
          <div className="flex items-center gap-3">
            <span className={contactIcon}><Mail aria-hidden className="size-4" /></span>
            <a href={`mailto:${COMPANY.email}`} className="min-w-0 text-[0.95rem] text-white/75 [overflow-wrap:anywhere] hover:text-white">{COMPANY.email}</a>
            <CopyEmail email={COMPANY.email} />
          </div>
          <a href={telHref(COMPANY.phone)} className={contactItem}><span className={contactIcon}><Phone aria-hidden className="size-4" /></span>{COMPANY.phone}</a>
          <p className={contactItem}><span className={contactIcon}><MapPin aria-hidden className="size-4" /></span>{COMPANY.address}</p>
        </address>
      </div>
      <Wordmark />
      <div className="relative border-t border-white/10">
        <div className="container-1280 flex flex-wrap items-center justify-between gap-4 py-5 text-sm text-white/65">
          <p>Copyright © 2026 SocialGem. All rights reserved. <span aria-hidden className="px-1.5 text-white/30">|</span> A product of {COMPANY.name}.</p>
          <BackToTop />
        </div>
      </div>
    </FooterStage>
  );
}
