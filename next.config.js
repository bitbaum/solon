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
  // Libraries copied into public/vendor/<name>/<version>/ never change under
  // a path (scripts/build/vendor-maplibre.mjs), so browsers may keep them.
  async headers() {
    return [
      {
        source: "/vendor/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
