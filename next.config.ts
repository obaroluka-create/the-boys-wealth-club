import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loaded by Node at runtime instead of bundled: the embedded dev database ships WASM
  // and optional native hooks that the bundler cannot resolve.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
};

export default nextConfig;
