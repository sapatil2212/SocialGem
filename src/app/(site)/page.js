import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import GemCanvas from "@/components/site/GemCanvas";
import Playground from "@/components/site/Playground";
import Scenarios from "@/components/site/Scenarios";
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
        <section className="sg-hero sg-wrap">
          <div className="sg-hero-copy">
            <h1>Write it once. Let every side shine.</h1>
            <p>
              SocialGem shapes one post for each of your pages and puts it on a calendar, so your shop stays
              visible while you are busy running it.
            </p>
            <div className="sg-actions">
              <a className="sg-btn sg-btn-main" href="#try">Try the composer</a>
              <Link className="sg-btn" href="/app">Open early preview</Link>
            </div>
            <p className="sg-small">In development. No card, no sign-up to try it below.</p>
          </div>
          <GemCanvas />
        </section>

        <section id="try" className="sg-band">
          <div className="sg-wrap">
            <header className="sg-head">
              <h2>Go on, write a post</h2>
              <p>This is a working demo. Nothing leaves your browser.</p>
            </header>
            <Playground />
          </div>
        </section>

        <section id="publishing" className="sg-wrap sg-section">
          <header className="sg-head">
            <h2>What happens at 9:00 when you are with a customer?</h2>
            <p>Pick a situation. This is how publishing is designed to respond.</p>
          </header>
          <Scenarios />
        </section>

        <section id="platforms" className="sg-wrap sg-section">
          <header className="sg-head">
            <h2>What each platform accepts</h2>
            <p>Limits shown up front. Filter by what you post, or sort by caption length.</p>
          </header>
          <PlatformTable />
        </section>

        <section id="pricing" className="sg-deep">
          <div className="sg-wrap sg-price">
            <div>
              <h2>Start with 14 days free</h2>
              <p>Starter, Pro and Agency plans follow. We will publish prices at launch rather than guess today.</p>
            </div>
            <dl>
              <div><dt>Days</dt><dd>14</dd></div>
              <div><dt>Channels</dt><dd>3</dd></div>
              <div><dt>Posts</dt><dd>30</dd></div>
            </dl>
          </div>
        </section>

        <section id="faq" className="sg-wrap sg-section sg-faq">
          <h2>Good to know</h2>
          <div>
            {FAQ.map(([question, answer]) => (
              <details key={question} name="faq">
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="sg-wrap sg-foot">
        <strong>SocialGem</strong>
        <span>Built for small businesses, India first.</span>
        <Link href="/app">Early preview</Link>
      </footer>
    </>
  );
}
