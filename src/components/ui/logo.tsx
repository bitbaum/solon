interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const MARK = { sm: "h-6 w-6", md: "h-8 w-8", lg: "h-10 w-10" };
const WORD = { sm: "text-base", md: "text-lg", lg: "text-xl" };

/**
 * The scales and the word. No badge around the mark: on a photograph a boxed
 * logo reads as an app icon, and the mark is legible on its own.
 */
export default function Logo({ className = "", size = "md" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={MARK[size]}
        aria-hidden="true"
      >
        {/* The balance itself, in the accent all three products share. */}
        <g
          stroke="var(--public-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M24 8v32" />
          <path d="M12 40h24" />
          <path d="M8 16h32" />
          <path d="M8 16l-5 11a6 6 0 0 0 10 0z" />
          <path d="M40 16l5 11a6 6 0 0 1-10 0z" />
        </g>
      </svg>
      {/* Set in the sans like the headlines — the shared .wordmark is the serif. */}
      <div className={`${WORD[size]} font-bold uppercase tracking-caps text-fg-primary`}>Solon</div>
    </div>
  );
}
