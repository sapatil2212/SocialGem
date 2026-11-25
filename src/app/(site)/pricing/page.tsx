import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Faq } from "@/components/ui/accordion";

export const metadata = { title: "Pricing", description: "A 14-day free trial, then simple monthly plans." };

const PLANS = [
  { name: "Free trial", price: "14 days", text: "Try everything before you pay.", points: ["3 channels", "30 posts", "All calendar views"], action: true },
  { name: "Starter", price: "At launch", text: "For one shop, clinic or freelancer.", points: ["Channels to be announced", "Monthly post quota", "Email when a post fails"] },
  { name: "Pro", price: "At launch", text: "For businesses that post every day.", points: ["More channels", "Larger post quota", "Several workspaces"] },
  { name: "Agency", price: "At launch", text: "For teams handling several clients.", points: ["A workspace per client", "Largest post quota", "CSV export"] },
];

const QUESTIONS = [
  ["Why are there no prices yet?", "SocialGem is still being built. We would rather publish prices once than change them on you."],
  ["What counts as a post?", "One post to one platform. The same caption sent to Facebook and Instagram counts as two. This may be adjusted before launch."],
  ["Am I charged for posts that fail?", "No. Only a confirmed published post is counted."],
  ["How will I pay?", "UPI and cards through Razorpay in India, with GST details on your invoice if you add them."],
];

export default function PricingPage() {
  return (
    <>
      <section className="mesh-bg border-b border-hairline">
        <div className="container-1280 py-20 text-center lg:py-28">
          <h1 className="mx-auto">Pay for posts, <em className="accent gradient-text">not for seats</em></h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-ink">Start with a free trial. Monthly plans will follow at launch.</p>
        </div>
      </section>
      <section className="container-1280 grid gap-4 py-16 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan, i) => (
          <article key={plan.name} className={`reveal card-interactive flex flex-col p-5 ${plan.action ? "!border-brand" : ""}`} style={{ "--reveal-delay": `${i * 60}ms` } as React.CSSProperties}>
            <h2 className="!text-[1.1rem]">{plan.name}</h2>
            <p className="mt-5 text-2xl font-semibold tracking-[-0.035em]">{plan.price}</p>
            <p className="mt-3 text-muted-ink">{plan.text}</p>
            <ul className="mt-6 mb-8 grid gap-2.5">
              {plan.points.map((point) => <li key={point} className="flex gap-2.5"><Check aria-hidden className="mt-1 size-4 shrink-0 text-brand-ink" />{point}</li>)}
            </ul>
            {plan.action ? (
              <Button asChild className="mt-auto"><Link href="/signup">Set up your workspace</Link></Button>
            ) : (
              <p className="mt-auto flex min-h-11 items-center text-muted-ink">Price announced at launch</p>
            )}
          </article>
        ))}
      </section>
      <section className="sg-wrap sg-faq sg-section"><h2>About billing</h2><Faq items={QUESTIONS} /></section>
    </>
  );
}
