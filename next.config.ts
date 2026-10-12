import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  trailingSlash: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },

      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/nagmapvtltd/**",
      },
    ],
  },
};

export default nextConfig;
