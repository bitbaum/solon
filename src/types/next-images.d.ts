// Types for static image imports (`import photo from "…/x.webp"`).
//
// next-env.d.ts declares these too, but it is gitignored and only exists after
// `next build` or `next dev` — so CI's `verify`, which typechecks before it
// builds, could not resolve a single photograph. This file is committed.
/// <reference types="next/image-types/global" />
