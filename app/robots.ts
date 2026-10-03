import { MetadataRoute } from "next";
import lguConfig from "@/config/lgu.config.json";

export default function robots(): MetadataRoute.Robots {
  const website = lguConfig.identity.website;
  const baseUrl = website.includes("{{") ? null : website.replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/services",
          "/news",
          "/events",
          "/tourism",
          "/transparency",
          "/about",
          "/contact",
          "/faqs",
          "/citizen-charter",
          "/terms",
          "/privacy-policy",
        ],
        disallow: [
          // Administrative & Staff Dashboards
          "/admin",
          "/admin/*",
          "/captain",
          "/captain/*",
          "/mayor",
          "/mayor/*",
          "/poso",
          "/poso/*",
          
          // Resident Private Portal & Profiles
          "/user",
          "/user/*",
          
          // Internal APIs & Webhooks
          "/api",
          "/api/*",
          
          // Authentication & Reset Password flows
          "/auth",
          "/auth/*",
          
          // Payment processing & Checkout callbacks
          "/payment",
          "/payment/*",
          
          // Internal queue management
          "/queue",
          "/queue/*",
          
          // Maintenance mode internal pages
          "/maintenance",
        ],
      },
    ],
    ...(baseUrl ? { sitemap: `${baseUrl}/sitemap.xml` } : {}),
  };
}
