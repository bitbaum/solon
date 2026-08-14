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
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Shield shape representing trust and governance */}
          <path
            d="M24 4L8 10V24C8 32.5 14.5 40.5 24 44C33.5 40.5 40 32.5 40 24V10L24 4Z"
            fill="var(--navy)"
            stroke="var(--navy-light)"
            strokeWidth="2"
          />
          {/* Scale of justice - representing fairness */}
          <g transform="translate(16, 16)">
            <rect x="4" y="6" width="8" height="1" fill="white" />
            <rect x="2" y="7" width="12" height="1" fill="white" />
            <circle cx="4" cy="4" r="2" fill="white" />
            <circle cx="12" cy="4" r="2" fill="white" />
            <rect x="3" y="8" width="1" height="4" fill="white" />
            <rect x="12" y="8" width="1" height="4" fill="white" />
          </g>
        </svg>
      </div>
      <div className="font-bold text-xl text-navy tracking-tight">
        SOLON
      </div>
    </div>
  );
}


