import React from 'react';

// SVG Spade logo matching app title (gold gradient)
const SpadeLogo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 md:w-8 md:h-8',
    md: 'w-8 h-8 md:w-12 md:h-12',
    lg: 'w-12 h-12 md:w-16 md:h-16',
    xl: 'w-16 h-16 md:w-20 md:h-20'
  };

  // Use predictable ID for gradient to avoid hydration issues
  const gradientId = `spade-gold-${size}`;

  return (
    <svg
      viewBox="0 0 32 32"
      className={`${sizeClasses[size]} drop-shadow-[0_0_6px_rgba(255,215,0,0.2)]`}
      aria-label="Loading"
      role="img"
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#fffbe6" />
          <stop offset="60%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#B8860B" />
        </radialGradient>
      </defs>
      <path
        d="M16 3C11 9 4 13.5 4 20.5C4 24 7 27 10.5 27C12.5 27 14.5 26.5 16 25C17.5 26.5 19.5 27 21.5 27C25 27 28 24 28 20.5C28 13.5 21 9 16 3Z"
        fill={`url(#${gradientId})`}
      />
      <ellipse cx="16" cy="28.5" rx="2" ry="2.5" fill="#FFD700" opacity="0.7" />
    </svg>
  );
};

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  showMessage?: boolean;
  fullScreen?: boolean;
}

const DOT_COUNT = 8;

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  message = 'Loading...', 
  showMessage = true,
  fullScreen = true
}) => {
  const containerSizes = {
    sm: 'w-12 h-12 md:w-16 md:h-16',
    md: 'w-16 h-16 md:w-20 md:h-20',
    lg: 'w-20 h-20 md:w-24 md:h-24',
    xl: 'w-24 h-24 md:w-32 md:h-32'
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
    xl: 'w-3 h-3'
  };

  const radiusMap = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48
  };

  const radius = radiusMap[size];

  const spinner = (
    <div className={`relative ${containerSizes[size]} flex items-center justify-center`}>
      {/* Spade logo center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <SpadeLogo size={size} />
      </div>
      
      {/* Orbiting dots container */}
      <div className="absolute inset-0 animate-spin duration-1000">
        {Array.from({ length: DOT_COUNT }).map((_, i) => {
          const angle = (i / DOT_COUNT) * 360;
          return (
            <div
              key={i}
              className={`absolute ${dotSizes[size]} bg-yellow-400 rounded-full shadow-sm`}
              style={{
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px)`,
                opacity: 0.8,
              }}
            />
          );
        })}
      </div>
    </div>
  );

  if (!fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        {spinner}
        {showMessage && message && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex flex-col items-center justify-center gap-4">
        {spinner}
        {showMessage && message && (
          <p className="text-sm text-white/80 animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner; 