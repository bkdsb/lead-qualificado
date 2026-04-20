import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone", // Removido para evitar erro 503 no Vercel (conflito de serverless functions)
};

export default nextConfig;
