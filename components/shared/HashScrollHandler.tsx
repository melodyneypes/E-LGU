"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const NAVBAR_HEIGHT = 96;

export function HashScrollHandler() {
  const pathname = usePathname();

  useEffect(() => {
    const handleScrollToHash = () => {
      const hash = window.location.hash;
      if (!hash) return;

      const id = hash.replace("#", "").split("?")[0];
      if (!id) return;

      let attempt = 0;
      const maxAttempts = 12;
      const delays = [50, 150, 300, 500, 700, 1000, 1300, 1600, 2000, 2500, 3000, 3500];

      const tryScroll = () => {
        const element = document.getElementById(id);

        if (element) {
          const top =
            element.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT;
          window.scrollTo({ top, behavior: "smooth" });
          return;
        }

        if (attempt < maxAttempts) {
          setTimeout(tryScroll, delays[attempt] || 500);
          attempt++;
        }
      };

      tryScroll();
    };

    // Run on mount or pathname change
    handleScrollToHash();

    window.addEventListener("hashchange", handleScrollToHash);
    window.addEventListener("popstate", handleScrollToHash);
    return () => {
      window.removeEventListener("hashchange", handleScrollToHash);
      window.removeEventListener("popstate", handleScrollToHash);
    };
  }, [pathname]);

  return null;
}

