import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Language-aware navigation. Use these instead of next/link and
 * next/navigation for any link inside the site, so a reader on /de stays
 * on /de. (The design gate flags a bare next/link import.)
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
