"use client";

import Script from "next/script";

export default function AdsterraNativeBanner() {
  return (
    <section className="container-site py-10">
      <div className="w-full overflow-hidden">
        <Script
          id="adsterra-native-banner"
          async
          src="https://pl31702075.profitableratecpmnetwork.com/404ebc01508b459869e7d5831ddab522/invoke.js"
          strategy="afterInteractive"
        />

        <div id="container-404ebc01508b459869e7d5831ddab522" />
      </div>
    </section>
  );
}
