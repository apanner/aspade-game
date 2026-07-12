import React from 'react';
import { AppLogo } from '@/components/brand/app-logo';

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
        <AppLogo size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : size === 'xl' ? 'xl' : 'md'} />
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