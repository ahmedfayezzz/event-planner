import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude pdfkit from bundling to avoid font path resolution issues
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
