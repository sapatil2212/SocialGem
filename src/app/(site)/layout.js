import { Instrument_Sans, Unbounded } from "next/font/google";
import "./site.css";

const display = Unbounded({ variable: "--font-display", subsets: ["latin"], display: "swap" });
const body = Instrument_Sans({ variable: "--font-body", subsets: ["latin"], display: "swap" });

export default function SiteLayout({ children }) {
  return <div className={`sg ${display.variable} ${body.variable}`}>{children}</div>;
}
