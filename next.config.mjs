/** @type {import('next').NextConfig} */
const nextConfig = {
  publicRuntimeConfig: {
    staticFolder: "/public",
  },
  rules: {
    "no-unused-vars": "off",
    "no-unused-functions": "off",
    // Other rules...
  },
};

export default nextConfig;
