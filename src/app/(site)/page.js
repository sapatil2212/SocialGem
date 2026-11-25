import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Hero from "@/components/site/Hero";
import Features, { Roles } from "@/components/site/Features";
import Flight from "@/components/site/Flight";
import Playground from "@/components/site/Playground";
import PlatformTable from "@/components/site/PlatformTable";
import { Button } from "@/components/ui/button";
import { Faq } from "@/components/ui/accordion";
import { FAQ } from "@/content/landing";

export const metadata = {
  title: { absolute: "SocialGem: social media scheduling for small businesses" },
  description:
    "Write a post once, shape it for each platform and put it on a calendar. Built for shops, clinics, freelancers and small agencies.",
};

const STRIP = ["Draft", "Adjust per platform", "Check limits", "Pick a time", "Publish", "See the result"];

export default function LandingPage() {
  return (
    <>
      <Hero />

      <div className="marquee-wrap overflow-hidden border-y border-hairline bg-card py-5">
        <div className="marquee text-xl font-semibold">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex flex-wrap sm:flex-nowrap">
              {[...STRIP, ...STRIP].map((word, i) => (
                <span key={i} aria-hidden={i >= STRIP.length} className="flex items-center gap-8 px-4 whitespace-nowrap">
                  {word}<i className="size-2 rotate-45 bg-brand" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section id="features" className="sg-section sg-wrap">
        <header className="sg-head reveal">
          <h2>Everything a small team needs to <em className="accent gradient-text">post well</em></h2>
          <p>These are working previews. Click, type and drag.</p>
        </header>
        <Features />
      </section>

      <section id="make" className="sg-section sg-tint">
        <div className="sg-wrap">
          <header className="sg-head reveal">
            <h2>Try the composer</h2>
            <p>Write a post, check each preview, and place it on the week. Nothing leaves your browser.</p>
          </header>
          <Playground />
        </div>
      </section>

      <Flight />

      <section className="sg-section sg-tint">
        <div className="sg-wrap">
          <header className="sg-head reveal"><h2>Built around <em className="accent gradient-text">how you work</em></h2></header>
          <Roles />
        </div>
      </section>

      <section id="platforms" className="sg-section sg-wrap">
        <header className="sg-head reveal">
          <h2>What each platform accepts</h2>
          <p>Filter by what you post, or sort by caption length.</p>
        </header>
        <PlatformTable />
      </section>

      <section className="sg-section sg-wrap sg-faq">
        <h2>Questions, answered</h2>
        <Faq items={FAQ} />
      </section>

      <section className="sg-wrap pb-24">
        <div className="gradient-brand grid justify-items-center gap-7 rounded-[1.75rem] px-6 py-20 text-center">
          <h2>Your next week of posts starts with <em className="accent">one</em></h2>
          <p className="max-w-xl">SocialGem is in development. Look around the preview, or keep using the demo on this page.</p>
          <Button asChild variant="outline" size="lg"><Link href="/signup">Get started <ArrowRight /></Link></Button>
        </div>
      </section>
    </>
  );
}
