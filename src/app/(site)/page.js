import Link from "next/link";
import { ArrowRight, Check, Layers, PenLine, Send } from "lucide-react";
import HeroStage, { NetworkStrip } from "@/components/site/HeroStage";
import FlowDemo from "@/components/site/FlowDemo";
import Features, { Roles } from "@/components/site/Features";
import Flight from "@/components/site/Flight";
import Playground from "@/components/site/Playground";
import PlatformTable from "@/components/site/PlatformTable";
import { Button } from "@/components/ui/button";
import { Faq } from "@/components/ui/accordion";
import { FAQ } from "@/content/landing";

export const metadata = {
  title: { absolute: "SocialGem: social media scheduling for small businesses" },
  description: "Plan, create and schedule social posts from one calendar. Built for shops, clinics, freelancers and small agencies.",
};

const STEPS = [
  { Icon: PenLine, title: "Write the idea once", text: "Start with one caption and one photo or video." },
  { Icon: Layers, title: "Shape it per channel", text: "Adjust the wording and see each limit before you schedule." },
  { Icon: Send, title: "Place it on the week", text: "Pick a time, drag to move it, and keep the whole plan in view." },
];

export default function LandingPage() {
  return (
    <>
      <HeroStage />
      <NetworkStrip />

      <section id="features" className="sg-section sg-wrap">
        <header className="sg-head reveal">
          <h2>Everything a small team needs to <em className="accent gradient-text">post well</em></h2>
          <p>These are working previews. Click, type and drag.</p>
        </header>
        <Features />
      </section>

      <section className="sg-section sg-tint overflow-hidden">
        <div className="sg-wrap">
          <header className="sg-head reveal">
            <h2>One idea, <em className="accent gradient-text">every channel</em></h2>
            <p>Run the sample and watch a single post split into versions.</p>
          </header>
          <ol className="mb-10 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ Icon, title, text }, i) => (
              <li key={title} className="reveal flex gap-4" style={{ "--reveal-delay": `${i * 80}ms` }}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white"><Icon aria-hidden className="size-5" /></span>
                <div><h3 className="!text-[1.05rem]">{title}</h3><p className="mt-1 text-muted-ink">{text}</p></div>
              </li>
            ))}
          </ol>
          <FlowDemo />
        </div>
      </section>

      <section id="make" className="sg-section sg-wrap">
        <header className="sg-head reveal">
          <h2>Try the composer</h2>
          <p>Write a post, check each preview, and place it on the week. Nothing leaves your browser.</p>
        </header>
        <Playground />
      </section>

      <div id="reliability" className="sg-tint"><Flight /></div>

      <section className="sg-section sg-wrap">
        <header className="sg-head reveal"><h2>Built around <em className="accent gradient-text">how you work</em></h2></header>
        <Roles />
      </section>

      <section id="platforms" className="sg-section sg-tint">
        <div className="sg-wrap">
          <header className="sg-head reveal">
            <h2>What each platform accepts</h2>
            <p>Filter by what you post, or sort by caption length.</p>
          </header>
          <PlatformTable />
        </div>
      </section>

      <section className="sg-section sg-wrap">
        <div className="sg-price reveal">
          <div>
            <h2>Start free. <em className="accent gradient-text">Decide later.</em></h2>
            <p className="mt-4 max-w-lg text-base text-muted-ink">Plans are announced at launch, with the limits shown before you pay.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="shimmer"><Link href="/signup">Create your workspace <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/pricing">See pricing</Link></Button>
            </div>
          </div>
          <ul className="grid content-center gap-4 text-lg">
            {["A calendar for the whole week", "Separate workspaces for each brand", "Previews for every version", "No card needed to look around"].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-tint-strong"><Check aria-hidden className="size-4 text-brand-ink" /></span>{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sg-section sg-wrap sg-faq">
        <h2>Questions, answered</h2>
        <Faq items={FAQ} />
      </section>

      <section className="sg-wrap pb-18">
        <div className="sg-final">
          <div aria-hidden className="sg-aurora"><i /><i /><i /></div>
          <div className="relative grid justify-items-center gap-7 px-6 py-14 text-center sm:py-16">
            <h2 className="max-w-3xl">Your next week of posts starts with <em className="accent sg-prism">one</em></h2>
            <p className="max-w-xl text-base text-white/75">SocialGem is in early access. Set up your workspace and help shape what comes next.</p>
            <Button asChild size="lg" className="shimmer bg-white text-navy hover:bg-[#ece6ff]"><Link href="/signup">Get started free <ArrowRight /></Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}
