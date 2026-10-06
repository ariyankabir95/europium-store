"use client";
// Last-resort boundary: renders when the root layout itself fails (e.g. the CMS or Supabase is unreachable).
export default function GlobalError({ reset }) {
    return (<html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "6rem 1.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Something went wrong</h1>
        <p style={{ marginTop: "0.75rem" }}>Please try again. If it keeps happening, contact us.</p>
        <button onClick={reset} style={{ marginTop: "1.5rem", padding: "0.75rem 2rem", border: "1px solid #262421" }}>Try again</button>
      </body>
    </html>);
}
