/** The public address of this Solon, for links a crawler or a model follows out of the page. */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://solon.orangecat.ch").replace(
  /\/$/,
  "",
);
