import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://emapandan.com";

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
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
