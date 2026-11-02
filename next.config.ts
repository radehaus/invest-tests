import type { NextConfig } from "next";

// GitHub Pages serviert unter https://<user>.github.io/<repo>/ .
// Der Workflow setzt NEXT_PUBLIC_BASE_PATH=/<repo>. Lokal bleibt er leer.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
