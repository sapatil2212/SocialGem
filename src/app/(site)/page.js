import Link from "next/link";
import SceneMount from "@/components/site/SceneMount";
import SiteHeader from "@/components/site/SiteHeader";
import Story, { PreviewLink } from "@/components/site/Story";
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
      <SceneMount />
      <SiteHeader />
      <main id="main">
        <Story />
        <Flight />

        <section id="make" className="sg-sheet">
          <div className="sg-wrap">
            <header className="sg-head">
              <h2>Your turn at the controls</h2>
              <p>A working composer and week. Nothing leaves your browser.</p>
            </header>
            <div data-ui><Playground /></div>
          </div>
        </section>

        <section id="platforms" className="sg-sheet sg-sheet-next">
          <div className="sg-wrap">
            <header className="sg-head">
              <h2>Limits, up front</h2>
              <p>What each platform accepts, before you schedule. Filter by what you post, or sort by caption length.</p>
            </header>
            <PlatformTable />
          </div>
        </section>

        <section id="end" className="sg-end">
          <div className="sg-wrap">
            <h2>14 days. 3 channels. 30 posts. Free.</h2>
            <p>Starter, Pro and Agency plans follow, with prices at launch. SocialGem is still in development.</p>
            <PreviewLink />
          </div>
        </section>

        <section id="faq" className="sg-sheet">
          <div className="sg-wrap sg-faq">
            <h2>Good to know</h2>
            <div>
              {FAQ.map(([question, answer]) => (
                <details key={question} name="faq">
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="sg-foot">
        <div className="sg-wrap">
          <strong>SocialGem</strong>
          <span>Built for small businesses, India first.</span>
          <Link href="/app">Early preview</Link>
        </div>
      </footer>
    </>
  );
}
