import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Added from the .js version for Firebase/Vercel standalone output
  typescript: {
    ignoreBuildErrors: false, // Changed for stricter production builds
  },
  eslint: {
    ignoreDuringBuilds: false, // Changed for stricter production builds
  },
  webpack: (config, { dev, isServer }) => {
    // Handle @opentelemetry warnings
    config.ignoreWarnings = [
      { module: /@opentelemetry/ },
      { module: /genkit/ },
      // Add handlebars warning to ignore list
      { message: /require\.extensions/ },
    ];

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
    ],
  },
  // Ensure the public directory is served correctly for firebase-messaging-sw.js
  // Next.js automatically serves the public directory, so explicit config might not be needed
  // unless specific headers or rewrites are required for the service worker.
};

export default nextConfig;
