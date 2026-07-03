// 🐛 Mobile Debug Component
// This component helps debug mobile-specific issues

import { useState, useEffect } from 'react';

interface MobileDebugProps {
  gameId: string;
  currentPlayer: string | null;
  gameStatus: string;
}

export function MobileDebug({ gameId, currentPlayer, gameStatus }: MobileDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Enhanced mobile detection with iOS Safari support
    const isMobile = typeof window !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS|Safari/i.test(navigator.userAgent) ||
      window.innerWidth <= 768 ||
      window.innerHeight <= 600 ||
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0)
    );

    const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSChrome = typeof window !== 'undefined' && /CriOS/.test(navigator.userAgent);
    const isIOSSafari = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);
    const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent);
    const isChrome = typeof window !== 'undefined' && /Chrome/i.test(navigator.userAgent) && !/Edge/i.test(navigator.userAgent);
    const isFirefox = typeof window !== 'undefined' && /Firefox/i.test(navigator.userAgent);
    const isEdge = typeof window !== 'undefined' && /Edge/i.test(navigator.userAgent);

    setDebugInfo({
      isMobile,
      isIOS,
      isIOSChrome,
      isIOSSafari,
      isAndroid,
      isChrome,
      isFirefox,
      isEdge,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server-side',
      screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
      screenHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
      hasTouch: typeof window !== 'undefined' ? 'ontouchstart' in window : false,
      maxTouchPoints: typeof window !== 'undefined' ? navigator.maxTouchPoints : 0,
      platform: typeof window !== 'undefined' ? navigator.platform : 'unknown',
      vendor: typeof window !== 'undefined' ? navigator.vendor : 'unknown',
      language: typeof window !== 'undefined' ? navigator.language : 'unknown',
      cookieEnabled: typeof window !== 'undefined' ? navigator.cookieEnabled : false,
      onLine: typeof window !== 'undefined' ? navigator.onLine : false,
      gameId,
      currentPlayer,
      gameStatus,
      timestamp: new Date().toISOString()
    });

    // Enhanced mobile debugging console log
    console.log(`📱 Mobile Debug Component:`, {
      isMobile,
      isIOS,
      isIOSChrome,
      isIOSSafari,
      isAndroid,
      isChrome,
      isFirefox,
      isEdge,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server-side',
      screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
      screenHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
      hasTouch: typeof window !== 'undefined' ? 'ontouchstart' in window : false,
      maxTouchPoints: typeof window !== 'undefined' ? navigator.maxTouchPoints : 0,
      platform: typeof window !== 'undefined' ? navigator.platform : 'unknown',
      gameId,
      currentPlayer,
      gameStatus
    });
  }, [gameId, currentPlayer, gameStatus]);

  // Only show on mobile devices
  if (typeof window === 'undefined' || !debugInfo.isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-red-500 text-white p-2 rounded-full text-xs"
      >
        🐛
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-black text-white p-4 rounded-lg text-xs max-w-xs">
          <h3 className="font-bold mb-2">Mobile Debug Info</h3>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 