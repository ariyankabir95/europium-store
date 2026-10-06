/** Shows the one-line result (`?ok=` / `?error=`) that admin actions redirect back with. */
export default function Flash({ ok, error }) {
    if (!ok && !error)
        return null;
    return <p role={error ? "alert" : "status"} className={`mb-6 border px-4 py-3 text-sm ${error ? "border-red-800 text-red-800" : "border-sand bg-cream text-charcoal"}`}>{error ?? ok}</p>;
}
