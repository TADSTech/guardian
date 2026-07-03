import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@guardian/contracts", "@guardian/demo-fixtures"],
};

export default nextConfig;
