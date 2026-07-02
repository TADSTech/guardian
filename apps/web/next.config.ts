import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@guardian/contracts"],
};

export default nextConfig;
