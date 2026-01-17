import React from 'react';

const CTABackgroundSVG = ({ className = '', style = {} }) => {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 1200 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--secondary-color)" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--secondary-color)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      
      <rect width="1200" height="600" fill="url(#gradient1)" />
      
      <circle cx="200" cy="150" r="80" fill="var(--primary-color)" opacity="0.08" />
      <circle cx="1000" cy="450" r="120" fill="var(--secondary-color)" opacity="0.08" />
      <circle cx="600" cy="100" r="60" fill="var(--primary-color)" opacity="0.06" />
      <circle cx="150" cy="500" r="90" fill="var(--secondary-color)" opacity="0.06" />
      <circle cx="1100" cy="200" r="70" fill="var(--primary-color)" opacity="0.07" />
      
      <path
        d="M 0 300 Q 300 250 600 300 T 1200 300"
        stroke="var(--primary-color)"
        strokeWidth="2"
        fill="none"
        opacity="0.1"
      />
      <path
        d="M 0 400 Q 300 350 600 400 T 1200 400"
        stroke="var(--secondary-color)"
        strokeWidth="2"
        fill="none"
        opacity="0.1"
      />
      
      <rect x="100" y="50" width="150" height="100" rx="10" fill="var(--primary-color)" opacity="0.05" transform="rotate(15 175 100)" />
      <rect x="950" y="350" width="150" height="100" rx="10" fill="var(--secondary-color)" opacity="0.05" transform="rotate(-15 1025 400)" />
      
      <ellipse cx="400" cy="450" rx="100" ry="60" fill="url(#gradient2)" opacity="0.3" />
      <ellipse cx="800" cy="150" rx="80" ry="50" fill="url(#gradient2)" opacity="0.25" />
    </svg>
  );
};

export default CTABackgroundSVG;


