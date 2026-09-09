import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "LeagueSim — Football, forward",
  description: "Explore the real league, simulate what comes next, and understand uncertainty.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="shell nav">
            <Link href="/" className="brand" aria-label="LeagueSim home">
              <span className="brand-mark">LS</span>
              LeagueSim
            </Link>
            <nav className="nav-links" aria-label="Main navigation">
              <Link href="/#table">Table</Link>
              <Link href="/#fixtures">Fixtures</Link>
              <Link href="/#simulation">Simulator</Link>
              <Link href="/account">Account</Link>
            </nav>
            <span className="status-pill">Demo data</span>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
