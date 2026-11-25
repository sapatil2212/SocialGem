import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import SiteHeader, { Logo } from "@/components/site/SiteHeader";
import Hero from "@/components/site/Hero";
import Features, { Roles } from "@/components/site/Features";
import Flight from "@/components/site/Flight";
import Playground from "@/components/site/Playground";
import PlatformTable from "@/components/site/PlatformTable";
import { FAQ } from "@/content/landing";

export const metadata = {
  title: { absolute: "SocialGem: social media scheduling for small businesses" },
  description:
    "Write a post once, shape it for each platform and put it on a calendar. Built for shops, clinics, freelancers and small agencies.",
};

export default function LandingPage() {
  return (
    <>
      <a className="sg-skip" href="#main">Skip to content</a>
      <SiteHeader />
      <main id="main">
        <Hero />

        <section id="features" className="sg-section sg-wrap">
          <header className="sg-head">
            <h2>Everything a small team needs to post well</h2>
            <p>These are working previews. Click, type and drag.</p>
          </header>
          <Features />
        </section>

        <section id="make" className="sg-section sg-tint">
          <div className="sg-wrap">
            <header className="sg-head">
              <h2>Try the composer</h2>
              <p>Write a post, check each preview, and place it on the week. Nothing leaves your browser.</p>
            </header>
            <Playground />
          </div>
        </section>

        <Flight />

        <section className="sg-section sg-tint">
          <div className="sg-wrap">
            <header className="sg-head"><h2>Built around how you work</h2></header>
            <Roles />
          </div>
        </section>

        <section id="platforms" className="sg-section sg-wrap">
          <header className="sg-head">
            <h2>What each platform accepts</h2>
            <p>Filter by what you post, or sort by caption length.</p>
          </header>
          <PlatformTable />
        </section>

        <section id="start" className="sg-section sg-wrap">
          <header className="sg-head">
            <h2>Choose how to start</h2>
            <p>SocialGem is in development. Prices will be published at launch.</p>
          </header>
          <div className="sg-starts">
            <a href="#make"><h3>Use the demo</h3><p>The composer and simulator on this page. No account needed.</p><span>Open the composer <FiArrowRight aria-hidden="true" /></span></a>
            <Link href="/app" className="is-main"><h3>See the early preview</h3><p>Look around the dashboard while we build it.</p><span>Open the preview <FiArrowRight aria-hidden="true" /></span></Link>
            <div><h3>Free trial at launch</h3><p>14 days, 3 channels and 30 posts. Starter, Pro and Agency plans follow.</p><span>Prices to come</span></div>
          </div>
        </section>

        <section id="faq" className="sg-section sg-wrap sg-faq">
          <h2>Questions, answered</h2>
          <div>
            {FAQ.map(([question, answer]) => (
              <details key={question} name="faq">
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="sg-wrap">
          <div className="sg-cta">
            <h2>Your next week of posts starts with one</h2>
            <a className="sg-btn" href="#make">Write it now</a>
          </div>
        </section>
      </main>
      <footer className="sg-wrap sg-foot">
        <div><span className="sg-logo"><Logo /></span><p>Social media scheduling for small businesses, India first.</p></div>
        <nav aria-label="Product"><strong>Product</strong><a href="#features">Features</a><a href="#make">Composer</a><a href="#platforms">Platforms</a></nav>
        <nav aria-label="More"><strong>More</strong><a href="#start">Pricing</a><a href="#faq">Questions</a><Link href="/login">Log in</Link></nav>
      </footer>
    </>
  );
}
