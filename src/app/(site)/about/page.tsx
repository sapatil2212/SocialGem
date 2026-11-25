import Link from "next/link";
import { ArrowRight, CalendarDays, Eye, Layers, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMPANY } from "@/content/company";

export const metadata = { title: "About Us", description: "Who makes SocialGem and why." };

const VALUES = [
  { Icon: CalendarDays, name: "Calm planning", text: "A week of posts should take one sitting, not one interruption after another." },
  { Icon: Eye, name: "Honest limits", text: "We show what a platform will not accept before you schedule, and say plainly what is still being built." },
  { Icon: Layers, name: "Separate by design", text: "Every business or client gets its own workspace, so accounts and posts never mix." },
];

export default function AboutPage() {
  return (
    <>
      <section className="mesh-bg border-b border-hairline">
        <div className="container-1280 py-14 lg:py-18">
          <h1>Social media that fits <em className="accent gradient-text">around your work</em></h1>
          <p className="mt-6 max-w-2xl text-base text-muted-ink">SocialGem is built for the shop owner, clinic, freelancer or small agency who has posts to publish and a business to run.</p>
        </div>
      </section>
      <section className="container-1280 grid gap-5 py-16 md:grid-cols-3">
        {VALUES.map(({ Icon, name, text }, i) => (
          <article key={name} className="reveal card-interactive p-5" style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}>
            <Icon aria-hidden className="size-7 text-brand-ink" />
            <h2 className="mt-5 !text-[1.1rem]">{name}</h2>
            <p className="mt-3 text-muted-ink">{text}</p>
          </article>
        ))}
      </section>
      <section className="container-1280 pb-18">
        <div className="card-elevated flex flex-wrap items-center justify-between gap-6 p-8">
          <div>
            <h2 className="!text-[1.3rem]">A product of {COMPANY.name}</h2>
            <p className="mt-2 flex items-center gap-2 text-muted-ink"><MapPin aria-hidden className="size-4" />{COMPANY.address}</p>
          </div>
          <Button asChild><Link href="/contact">Talk to us <ArrowRight /></Link></Button>
        </div>
      </section>
    </>
  );
}
