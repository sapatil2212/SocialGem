import Link from "next/link";
import { Faq } from "@/components/ui/accordion";
import { HELP } from "@/content/pages";

export const metadata = { title: "Help", description: "Platform limits and common questions." };

export default function HelpPage() {
  return (
    <>
      <section className="mesh-bg border-b border-hairline">
        <div className="container-1280 py-20 lg:py-24">
          <h1>What works, and <em className="accent gradient-text">what does not</em></h1>
          <p className="mt-6 max-w-xl text-xl text-muted-ink">Platform rules explained plainly, so nothing surprises you later.</p>
        </div>
      </section>
      <section className="container-1280 max-w-4xl py-16">
        <Faq items={HELP} />
        <p className="mt-10 text-muted-ink">Still stuck? <Link href="/contact" className="font-semibold text-brand-ink underline underline-offset-4">Contact us</Link>.</p>
      </section>
    </>
  );
}
