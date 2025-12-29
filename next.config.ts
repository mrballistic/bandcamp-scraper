import type { NextConfig } from "next";

/** Base Next.js configuration for the Bandcamp scraper UI. */
const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium'],
};

export default nextConfig;
