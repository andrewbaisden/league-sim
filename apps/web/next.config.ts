import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@leaguesim/domain",
    "@leaguesim/validation",
    "@leaguesim/config",
    "@leaguesim/db",
  ],
};

export default nextConfig;
