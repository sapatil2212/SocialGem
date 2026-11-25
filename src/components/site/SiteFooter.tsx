import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import Logo from "./Logo";

// Contact details come from the environment. Until they are set, nothing is shown.
export const contact = {
  email: process.env.SUPPORT_EMAIL || "",
  phone: process.env.CONTACT_PHONE || "",
  whatsapp: process.env.CONTACT_WHATSAPP || "",
};

const COLUMNS = [
  { title: "Product", links: [["/#features", "Features"], ["/#make", "Composer"], ["/pricing", "Pricing"], ["/help", "Help"]] },
  { title: "Legal", links: [["/privacy", "Privacy"], ["/terms", "Terms"], ["/data-deletion", "Data deletion"], ["/contact", "Contact"]] },
];

export function ContactStack() {
  const items = [
    contact.whatsapp && {
      href: `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Hello, I have a question about SocialGem.")}`,
      label: "Chat on WhatsApp",
      icon: <FaWhatsapp />,
    },
    contact.phone && { href: `tel:${contact.phone}`, label: "Call us", icon: <Phone /> },
    contact.email && { href: `mailto:${contact.email}`, label: "Email us", icon: <Mail /> },
  ].filter((item): item is { href: string; label: string; icon: React.JSX.Element } => Boolean(item));
  if (!items.length) return null;
  return (
    <aside aria-label="Contact" className="fixed right-4 bottom-4 z-30 grid gap-2">
      {items.map((item) => (
        <a key={item.href} href={item.href} aria-label={item.label} className="glass grid size-12 place-items-center rounded-full hover:border-brand [&_svg]:size-5">
          {item.icon}
        </a>
      ))}
    </aside>
  );
}

export default function SiteFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="container-1280 grid gap-10 py-16 sm:grid-cols-[1fr_auto_auto] sm:gap-20">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-white/70">Social media scheduling for small businesses, India first.</p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="grid content-start">
            <strong className="mb-2">{column.title}</strong>
            {column.links.map(([href, label]) => (
              <Link key={href} href={href} className="flex min-h-11 items-center text-white/75 hover:text-white sm:min-h-9">{label}</Link>
            ))}
          </nav>
        ))}
      </div>
    </footer>
  );
}
