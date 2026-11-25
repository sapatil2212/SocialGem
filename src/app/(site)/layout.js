import { Onest } from "next/font/google";
import "./site.css";

const body = Onest({ variable: "--font-body", subsets: ["latin"], display: "swap" });

export default function SiteLayout({ children }) {
  return <div className={`sg ${body.variable}`}>{children}</div>;
}
