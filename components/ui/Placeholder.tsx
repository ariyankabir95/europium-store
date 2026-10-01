// Flat tonal stand-in until real photography is added to /public/images.
export default function Placeholder({ label, tone = "sand", className = "" }: { label: string; tone?: "sand" | "cream" | "taupe"; className?: string }) {
  const bg = { sand: "bg-sand", cream: "bg-cream", taupe: "bg-taupe" }[tone];
  return <div role="img" aria-label={label} className={`flex h-full w-full items-end p-4 ${bg} ${className}`}><span className="font-serif text-sm text-umber/70">{label}</span></div>;
}
