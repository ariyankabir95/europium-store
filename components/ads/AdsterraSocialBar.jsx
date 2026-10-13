"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const PRIVATE_PREFIXES = ["/admin", "/account", "/checkout", "/cart", "/login", "/auth", "/wishlist"];

export default function AdsterraSocialBar({ enabled = true }) {
  const pathname = usePathname();
  const isPrivateOrTransactional = PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)
  );

  // Keep ad scripts away from admin tools, customer accounts and transactional pages.
  if (!enabled || !pathname || isPrivateOrTransactional) return null;

  return (
    <Script
      id="adsterra-social-bar"
      src="https://pl31702073.profitableratecpmnetwork.com/43/6e/bd/436ebd30ddb03269f3c353ab0bcabf3b.js"
      strategy="afterInteractive"
    />
  );
}
