// 🧪 iOS Chrome Test Component
// This component helps test button handling specifically on iOS Chrome

import { useState } from 'react';
import { Button } from './ui/button';

interface IOSChromeTestProps {
  onTestClick: () => void;
  onTestTouch: () => void;
}

export function IOSChromeTest({ onTestClick, onTestTouch }: IOSChromeTestProps) {
  const [clickCount, setClickCount] = useState(0);
  const [touchCount, setTouchCount] = useState(0);
  
  const isIOSChrome = typeof window !== 'undefined' && /CriOS/.test(navigator.userAgent);
  
  if (!isIOSChrome) {
    return null; // Only show on iOS Chrome
  }

  const handleTestClick = () => {
    setClickCount(prev => prev + 1);
    onTestClick();
  };

  const handleTestTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    setTouchCount(prev => prev + 1);
    onTestTouch();
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-yellow-500 text-black p-3 rounded-lg text-xs">
      <h3 className="font-bold mb-2">🧪 iOS Chrome Test</h3>
      <div className="space-y-2">
        <Button 
          onClick={handleTestClick}
          onTouchStart={handleTestTouch}
          className="w-full h-8 text-xs"
        >
          Test Button (Click: {clickCount}, Touch: {touchCount})
        </Button>
        <div className="text-xs">
          <div>User Agent: {navigator.userAgent}</div>
          <div>Screen: {window.innerWidth}x{window.innerHeight}</div>
        </div>
      </div>
    </div>
  );
} 