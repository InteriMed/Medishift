'use client';

import { cn } from "@/lib/utils";

interface AnimatedClipizyLogoProps {
  state?: 'idle' | 'loading' | 'success' | 'error';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function AnimatedClipizyLogo({ 
  state = 'idle', 
  size = 'medium',
  className 
}: AnimatedClipizyLogoProps) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const getGradients = () => {
    if (state === 'success') {
      return {
        gradient1: { start: '#10b981', end: '#059669' },
        gradient2: { start: '#10b981', end: '#059669' },
        gradient3: { start: '#10b981', end: '#059669' }
      };
    }
    if (state === 'error') {
      return {
        gradient1: { start: '#ef4444', end: '#dc2626' },
        gradient2: { start: '#ef4444', end: '#dc2626' },
        gradient3: { start: '#ef4444', end: '#dc2626' }
      };
    }
    if (state === 'loading') {
      return {
        gradient1: { start: '#00C6FF', end: '#0072FF' },
        gradient2: { start: '#7A00FF', end: '#FF00C6' },
        gradient3: { start: '#00C6FF', end: '#7A00FF' }
      };
    }
    return {
      gradient1: { start: '#00C6FF', end: '#0072FF' },
      gradient2: { start: '#7A00FF', end: '#FF00C6' },
      gradient3: { start: '#00C6FF', end: '#7A00FF' }
    };
  };

  const gradients = getGradients();

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <svg
        viewBox="0 0 256 256"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <defs>
          <linearGradient x1="0%" y1="50%" x2="100%" y2="50%" id="linearGradient-1">
            <stop stopColor={gradients.gradient1.start} offset="0%"></stop>
            <stop stopColor={gradients.gradient1.end} offset="100%"></stop>
          </linearGradient>
          <linearGradient x1="50%" y1="0%" x2="50%" y2="100%" id="linearGradient-2">
            <stop stopColor={gradients.gradient2.start} offset="0%"></stop>
            <stop stopColor={gradients.gradient2.end} offset="100%"></stop>
          </linearGradient>
          <linearGradient x1="100%" y1="50%" x2="0%" y2="50%" id="linearGradient-3">
            <stop stopColor={gradients.gradient3.start} offset="0%"></stop>
            <stop stopColor={gradients.gradient3.end} offset="100%"></stop>
          </linearGradient>
        </defs>
        <g
          id="Play-Button"
          stroke="none"
          strokeWidth="1"
          fill="none"
          fillRule="evenodd"
          className={cn(
            state === 'loading' && "animate-pulse",
            state === 'success' && "animate-pulse"
          )}
        >
          <g id="Group">
            <path
              d="M60,230 C52.2680135,230 46,223.731986 46,216 L46,40 C46,32.2680135 52.2680135,26 60,26 C63.5760199,26 67.0211837,27.3757156 69.6464466,29.8535534 L201.646447,157.853553 C207.504343,163.711449 207.504343,173.208904 201.646447,179.0668 C199.021184,181.544638 195.57602,182.920353 192,182.920353 L60,230 Z"
              id="Path"
              fill="url(#linearGradient-1)"
            ></path>
            <path
              d="M60,230 C52.2680135,230 46,223.731986 46,216 L46,40 C46,32.2680135 52.2680135,26 60,26 C63.5760199,26 67.0211837,27.3757156 69.6464466,29.8535534 L201.646447,157.853553 C207.504343,163.711449 207.504343,173.208904 201.646447,179.0668 C199.021184,181.544638 195.57602,182.920353 192,182.920353 L60,230 Z"
              id="Path"
              fill="url(#linearGradient-2)"
              opacity="0.699999988"
              transform="translate(126.000000, 128.000000) rotate(120.000000) translate(-126.000000, -128.000000) "
            ></path>
            <path
              d="M60,230 C52.2680135,230 46,223.731986 46,216 L46,40 C46,32.2680135 52.2680135,26 60,26 C63.5760199,26 67.0211837,27.3757156 69.6464466,29.8535534 L201.646447,157.853553 C207.504343,163.711449 207.504343,173.208904 201.646447,179.0668 C199.021184,181.544638 195.57602,182.920353 192,182.920353 L60,230 Z"
              id="Path"
              fill="url(#linearGradient-3)"
              opacity="0.5"
              transform="translate(126.000000, 128.000000) rotate(240.000000) translate(-126.000000, -128.000000) "
            ></path>
            <path
              d="M105.5,145.5 C101.910149,145.5 99,142.589851 99,139 L99,117 C99,113.410149 101.910149,110.5 105.5,110.5 C107.223913,110.5 108.877273,111.184822 110.096194,112.403743 L128.096194,130.403743 C130.634559,132.942108 130.634559,137.057892 128.096194,139.596257 C126.877273,140.815178 125.223913,141.5 123.5,141.5 L105.5,145.5 Z"
              id="Path"
              fill="#FFFFFF"
            ></path>
          </g>
        </g>
      </svg>
    </div>
  );
}
