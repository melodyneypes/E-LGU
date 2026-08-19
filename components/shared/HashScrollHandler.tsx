"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const NAVBAR_HEIGHT = 96;

export function HashScrollHandler() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const id = hash.replace("#", "").split("?")[0];

    // Sections use nextDynamic (lazy loaded), so the DOM element may NOT exist
    // immediately after navigation. We retry with increasing delays to give
    // dynamic sections time to mount before giving up.
    let attempt = 0;
    const maxAttempts = 8;
    const delays = [300, 500, 700, 900, 1200, 1500, 1800, 2200]; // ms

    const tryScroll = () => {
      const element = document.getElementById(id);

      if (element) {
        const top =
          element.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT;
        window.scrollTo({ top, behavior: "smooth" });
        return; // Success — stop retrying
      }

      if (attempt < maxAttempts) {
        setTimeout(tryScroll, delays[attempt]);
        attempt++;
      }
      // If still not found after maxAttempts, silently give up
    };

    // Start first attempt after a short initial delay
    // (accounts for page transition animations)
    setTimeout(tryScroll, delays[0]);
  }, [pathname]); // Re-run every time we navigate to a new page

  return null;
}
