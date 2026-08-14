/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output is required by the self-hosted Hetzner deploy
  // (scripts/hetzner/deploy.sh stages the standalone build, same as every
  // sibling app on the box).
  output: 'standalone',
};

module.exports = nextConfig;