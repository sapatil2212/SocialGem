import { TriangleAlert } from "lucide-react";
import type { Doc } from "@/content/pages";

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export default function DocPage({ doc }: { doc: Doc }) {
  return (
    <div className="container-1280 grid gap-12 py-16 lg:grid-cols-[240px_minmax(0,1fr)] lg:py-16">
      <nav aria-label="On this page" className="hidden content-start lg:sticky lg:top-28 lg:grid lg:self-start">
        {doc.sections.map(([title]) => (
          <a key={title} href={`#${slug(title)}`} className="border-l border-hairline py-2 pl-4 text-muted-ink hover:border-brand hover:text-foreground">{title}</a>
        ))}
      </nav>
      <article className="max-w-2xl">
        <h1 className="!text-[clamp(1.9rem,3.4vw,2.6rem)]">{doc.title}</h1>
        <p className="mt-5 text-base text-muted-ink">{doc.intro}</p>
        <p className="mt-8 flex gap-3 rounded-xl border border-warning/30 bg-cream p-4 text-warning">
          <TriangleAlert className="mt-1 size-4 shrink-0" aria-hidden />
          Draft for legal review. Not yet in force. Details in [brackets] are still to be supplied.
        </p>
        {doc.sections.map(([title, lines]) => (
          <section key={title} id={slug(title)} className="mt-12">
            <h2 className="!text-[1.3rem]">{title}</h2>
            {lines.length === 1 ? (
              <p className="mt-4">{lines[0]}</p>
            ) : (
              <ul className="mt-4 grid list-disc gap-2 pl-5 marker:text-brand-ink">{lines.map((line) => <li key={line}>{line}</li>)}</ul>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}
