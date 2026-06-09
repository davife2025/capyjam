/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@capyjam/types", "@capyjam/game-engine", "@capyjam/supabase-client"],
  experimental: {
    optimizePackageImports: ["phaser"],
  },
  webpack(config) {
    // Phaser needs canvas
    config.externals = config.externals || [];
    return config;
  },
};

export default nextConfig;
