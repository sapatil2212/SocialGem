import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { COMPANY as contact, telHref } from "@/content/company";

export const metadata = { title: "Contact", description: "How to reach SocialGem." };

export default function ContactPage() {
  const ways = [
    contact.email && { Icon: Mail, name: "Email", value: contact.email, href: `mailto:${contact.email}` },
    contact.phone && { Icon: Phone, name: "Phone", value: contact.phone, href: telHref(contact.phone) },
    contact.whatsapp && { Icon: MessageCircle, name: "WhatsApp", value: `+${contact.whatsapp}`, href: `https://wa.me/${contact.whatsapp}` },
  ].filter((way): way is { Icon: typeof Mail; name: string; value: string; href: string } => Boolean(way));

  return (
    <section className="mesh-bg min-h-[70vh]">
      <div className="container-1280 py-20 lg:py-28">
        <h1>Talk to <em className="accent gradient-text">a person</em></h1>
        <p className="mt-6 max-w-xl text-xl text-muted-ink">Questions about accounts, plans or your data are all welcome.</p>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {ways.map(({ Icon, name, value, href }) => (
            <a key={name} href={href} className="card-interactive p-7">
              <Icon aria-hidden className="size-6 text-brand-ink" />
              <h2 className="mt-5 !text-[1.35rem]">{name}</h2>
              <p className="mt-2 text-muted-ink [overflow-wrap:anywhere]">{value}</p>
            </a>
          ))}
          <div className="card-interactive p-7">
            <MapPin aria-hidden className="size-6 text-brand-ink" />
            <h2 className="mt-5 !text-[1.35rem]">Address</h2>
            <p className="mt-2 text-muted-ink">{contact.address}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
