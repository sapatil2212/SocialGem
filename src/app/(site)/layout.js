import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./site.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], display: "swap" });
const body = Figtree({ variable: "--font-body", subsets: ["latin"], display: "swap" });

export default function SiteLayout({ children }) {
  return <div className={`sg ${display.variable} ${body.variable}`}>{children}</div>;
}
