import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFaq } from "bip-kit";
import { readCollection, readEntry } from "bip-kit/node";

/**
 * The deep side's long-form pages, read from `content/`: markdown files
 * reviewed like code, parsed by bip-kit (the fleet's shared kit), so the
 * questions, the whitepaper and the blog use the same reader as every other
 * product. Read at build time only: these routes are static, and the
 * standalone server that runs on the box does not carry `content/`.
 */
const CONTENT = join(process.cwd(), "content");
const BLOG = join(CONTENT, "blog");

export const faqSections = () => parseFaq(readFileSync(join(CONTENT, "faq.md"), "utf8"));

export const whitepaper = () => readEntry(CONTENT, "whitepaper");

export const blogPosts = () => readCollection(BLOG);

export const blogPost = (slug: string) => readEntry(BLOG, slug);
