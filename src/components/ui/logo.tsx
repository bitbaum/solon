import { SOLON_MARK } from "@/lib/brand/mark";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const MARK = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-10 w-10" };
const WORD = { sm: "text-base", md: "text-lg", lg: "text-xl" };

/**
 * The owl and the word. The owl is Athens' little owl — the bird on the coins
 * of Solon's city — with the family's rotorelief rings for eyes, a sibling of
 * OrangeCat's cat. The drawing is brand/solon-mark.svg; this renders it from
 * the generated data, so replacing the drawing replaces it here too.
 */
export default function Logo({ className = "", size = "md" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox={SOLON_MARK.viewBox.join(" ")}
        xmlns="http://www.w3.org/2000/svg"
        className={`${MARK[size]} text-accent`}
        aria-hidden="true"
      >
        <path fill="currentColor" fillRule={SOLON_MARK.fillRule} d={SOLON_MARK.d} />
      </svg>
      {/* Set in the sans like the headlines — the shared .wordmark is the serif. */}
      <div className={`${WORD[size]} font-bold uppercase tracking-caps text-fg-primary`}>Solon</div>
    </div>
  );
}
