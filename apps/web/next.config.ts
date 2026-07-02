import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@guardian/contracts", "@guardian/demo-fixtures"],
};

export default nextConfig;
