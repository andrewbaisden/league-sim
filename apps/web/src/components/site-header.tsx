"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function SiteHeader() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <header className="shell nav">
      <Link href="/" className="brand" aria-label="LeagueSim home">
        <span className="brand-mark">LS</span>
        LeagueSim
      </Link>
      <nav className="nav-links" aria-label="Main navigation">
        <Link href="/#table">Table</Link>
        <Link href="/#fixtures">Fixtures</Link>
        <Link href="/#simulation">Simulator</Link>
        <Link href="/account">{session ? "My account" : "Sign in"}</Link>
      </nav>
      <div className="nav-status">
        {isPending ? (
          <span className="status-pill">Checking session…</span>
        ) : session ? (
          <Link href="/account" className="status-pill signed-in" aria-label="Signed in account">
            Signed in · {session.user.name}
          </Link>
        ) : (
          <span className="status-pill">Demo data · signed out</span>
        )}
      </div>
    </header>
  );
}
