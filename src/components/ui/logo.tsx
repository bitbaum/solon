import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-control border border-default bg-surface-base`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/5 h-3/5"
          aria-hidden="true"
        >
          {/* Scales — the mark is the balance itself, in the accent all three
              products share, on the same badge shape OrangeCat uses. */}
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
      </div>
      <div className="font-display font-semibold text-lg text-fg-primary tracking-display">
        SOLON
      </div>
    </div>
  );
}


