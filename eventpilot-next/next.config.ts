import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude native modules from bundling
  serverExternalPackages: ["pdfkit", "@napi-rs/canvas", "canvas"],
};

export default nextConfig;
