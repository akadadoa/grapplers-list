/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude mapbox-gl from the server-side bundle
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push("mapbox-gl");
      }
    }
    return config;
  },
};

export default nextConfig;
