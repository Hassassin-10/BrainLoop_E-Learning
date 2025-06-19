import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
  webpack: (config, { dev, isServer }) => {
    // Handle warnings
    config.ignoreWarnings = [
      { module: /@opentelemetry/ },
      { module: /genkit/ },
      { module: /@splinetool/ },
      { message: /require\.extensions/ },
    ];

    // Optimize bundle
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
    }

    // Handle different environment builds
    if (isServer) {
      // Server-specific optimizations
      config.resolve.alias = {
        ...config.resolve.alias,
        "@server": "./src/lib/server-operations.ts",
      };
    } else {
      // Client-specific optimizations
      config.resolve.alias = {
        ...config.resolve.alias,
        "@client": "./src/lib/firebase-client.ts",
      };
    }

    // Configure proper resolution for @splinetool/react-spline
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        module: false,
      };
    }

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https", // For user avatars from Vercel
        hostname: "avatar.vercel.sh",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "prod.spline.design",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // Ensure the public directory is served correctly for firebase-messaging-sw.js
  // Next.js automatically serves the public directory, so explicit config might not be needed
  // unless specific headers or rewrites are required for the service worker.
};

export default nextConfig;
