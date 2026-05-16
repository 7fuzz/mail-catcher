/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  // Fix for multiple lockfiles warning and path resolution
  transpilePackages: ['@prisma/client'],
}

export default nextConfig
