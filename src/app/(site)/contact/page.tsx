import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contact } from "@/components/site/SiteFooter";

export const metadata = { title: "Contact", description: "How to reach SocialGem." };

export default function ContactPage() {
  const ways = [
    contact.email && { Icon: Mail, name: "Email", value: contact.email, href: `mailto:${contact.email}` },
    contact.phone && { Icon: Phone, name: "Phone", value: contact.phone, href: `tel:${contact.phone}` },
    contact.whatsapp && { Icon: MessageCircle, name: "WhatsApp", value: `+${contact.whatsapp}`, href: `https://wa.me/${contact.whatsapp}` },
  ].filter((way): way is { Icon: typeof Mail; name: string; value: string; href: string } => Boolean(way));

  return (
    <section className="mesh-bg min-h-[70vh]">
      <div className="container-1280 py-20 lg:py-28">
        <h1>Talk to <em className="accent gradient-text">a person</em></h1>
        <p className="mt-6 max-w-xl text-xl text-muted-ink">Questions about accounts, plans or your data are all welcome.</p>
        {ways.length ? (
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {ways.map(({ Icon, name, value, href }) => (
              <a key={name} href={href} className="card-interactive p-7">
                <Icon aria-hidden className="size-6 text-brand-ink" />
                <h2 className="mt-5 !text-[1.35rem]">{name}</h2>
                <p className="mt-2 text-muted-ink [overflow-wrap:anywhere]">{value}</p>
              </a>
            ))}
          </div>
        ) : (
          <div className="card-elevated mt-12 max-w-xl p-8">
            <h2 className="!text-[1.35rem]">Contact details are coming</h2>
            <p className="mt-3 text-muted-ink">We will publish them here before launch. Most answers are already in Help.</p>
            <Button asChild variant="outline" className="mt-6"><Link href="/help">Open Help</Link></Button>
          </div>
        )}
      </div>
    </section>
  );
}
