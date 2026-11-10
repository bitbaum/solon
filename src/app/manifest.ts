import type { MetadataRoute } from "next";

/**
 * The web app manifest. Without it Android and desktop browsers never offer
 * "Install app", so the site could only be pinned as a bookmark. The PNGs in
 * The icons are written from brand/solon-mark.svg by `pnpm run brand -- --png`
 * (192, 512, and a maskable 512 with the owl inside the safe zone).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Solon — Governance any group can run",
    short_name: "Solon",
    description:
      "Proposals, votes and the books, where every member can see them — for companies, towns, associations and communities.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/app-icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
