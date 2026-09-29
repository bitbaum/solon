const createNextIntlPlugin = require("next-intl/plugin");

// Points next-intl at the request config that picks each request's language
// and loads its messages (English underneath, the translation on top).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output is required by the self-hosted Hetzner deploy
  // (scripts/hetzner/deploy.sh stages the standalone build, same as every
  // sibling app on the box).
  output: "standalone",
  // Member pictures come from OrangeCat's storage (the identity root keeps
  // the profile; Solon only shows it). No other remote images.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "supabase.orangecat.ch",
        pathname: "/storage/v1/object/public/**",
      },
      { protocol: "https", hostname: "orangecat.ch" },
    ],
  },
};

module.exports = withNextIntl(nextConfig);
