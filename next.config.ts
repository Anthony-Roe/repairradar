/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["http://admin.localhost:3000", "http://*.localhost:3000"],
  experimental: {
    nodeMiddleware: true, // Enables Node.js runtime for middleware
  },
};

export default nextConfig;