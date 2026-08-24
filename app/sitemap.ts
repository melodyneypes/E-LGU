import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://emapandan.com";
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
