import { MetadataRoute } from "next";
import lguConfig from "@/config/lgu.config.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const website = lguConfig.identity.website;
  const baseUrl = website.includes("{{") ? null : website.replace(/\/+$/, "");
  if (!baseUrl) return [];
  const now = new Date();

  // Core public routes to index on Google
  const routes = [
    "",
    "/services",
    "/news",
    "/events",
    "/tourism",
    "/transparency",
    "/contact",
    "/about",
    "/faqs",
    "/citizen-charter",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/news" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));
}
