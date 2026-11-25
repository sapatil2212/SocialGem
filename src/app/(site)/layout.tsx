import type { ReactNode } from "react";
import Effects from "@/components/site/Effects";
import SiteFooter, { ContactStack } from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import "./site.css";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="brand sg min-h-dvh">
      <a className="sg-skip" href="#main">Skip to content</a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <ContactStack />
      <Effects />
    </div>
  );
}
