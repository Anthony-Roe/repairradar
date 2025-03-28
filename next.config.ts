/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["http://admin.localhost:3000", "http://*.localhost:3000"],
};

export default nextConfig;