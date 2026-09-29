/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 是原生模塊，必須排除在打包之外
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
