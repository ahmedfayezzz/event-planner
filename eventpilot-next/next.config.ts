import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude native modules from bundling
  serverExternalPackages: ["pdfkit", "@napi-rs/canvas", "canvas"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
