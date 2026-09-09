import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell" style={{ padding: "80px 0" }}>
      <span className="eyebrow">404</span>
      <h1 style={{ fontSize: "4rem", letterSpacing: "-.06em", margin: "12px 0" }}>Out of play.</h1>
      <p style={{ color: "var(--muted)" }}>That LeagueSim page does not exist.</p>
      <Link className="link" href="/">
        Return to the table →
      </Link>
    </main>
  );
}
