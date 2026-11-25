import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata = {
  title: { default: "SocialGem", template: "%s | SocialGem" },
  description: "Plan, preview and schedule social posts for your business from one calendar.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${inter.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
