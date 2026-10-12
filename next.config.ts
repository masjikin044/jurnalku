import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Isi jurnal (JSON Tiptap) yang panjang tetap muat saat auto-save.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
