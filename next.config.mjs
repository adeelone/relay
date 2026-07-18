/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  staticPageGenerationTimeout: 10,
  experimental: {
    cpus: 4,
    serverComponentsExternalPackages: ["pg"],
  },
};

export default nextConfig;
