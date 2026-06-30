/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma/client", "mariadb", "@prisma/adapter-mariadb"],
  allowedDevOrigins: ["169.254.83.107", "100.125.65.69", "100.67.250.58", "100.110.197.61", "100.107.231.23", "100.127.242.29", "msi-eulysis"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ofxkeckgfxdthonilpfk.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wrkhqwrcdtfxowupjgkx.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wrkhqwrcdtfxowupjgkx.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'jjklrkuqawezmfjcumhm.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ntanbjizlavyokjdauag.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'mapandan.gov.ph',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
