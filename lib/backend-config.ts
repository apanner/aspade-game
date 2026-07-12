// 🎯 CENTRALIZED BACKEND CONFIGURATION
// This is the SINGLE place to update backend URL for the entire app
// All API calls should use this configuration

interface BackendConfig {
  BASE_URL: string;
  ENDPOINTS: {
    GAMES: {
      CREATE: string;
      JOIN: string;
      ACTION: string;
      DETAIL: string;
    };
    PLAYERS: {
      LOGIN: string;
      REGISTER: string;
      SUGGESTIONS: string;
      STATUS: string;
      RESUME: string;
      PROFILE: string;
      DASHBOARD: string;
      HISTORY: string;
    };
    ADMIN: {
      GAMES: string;
      PLAYERS: string;
      STORAGE_CONFIG: string;
      STORAGE_TEST: string;
    };
    HISTORY: string;
    LEADERBOARD: string;
    TEAMS_LEADERBOARD: string;
  };
}

// 🌐 DUAL-TYPE CONNECTION GATEWAY  
// Priority: Environment-based discovery
const CONNECTION_URLS = {
  LOCAL: 'http://localhost:3001',
  FALLBACK: 'http://127.0.0.1:3001'
};

// 📡 Connection status cache
let connectionCache: {
  workingUrl: string | null;
  lastChecked: number;
  status: 'local' | 'fallback' | 'environment' | 'unknown' | 'docker' | 'tailscale';
} = {
  workingUrl: null,
  lastChecked: 0,
  status: 'unknown'
};

// ⚡ Test connection to backend
async function testConnection(url: string, timeout: number = 10000): Promise<boolean> {
  try {
    console.log(`🔌 Testing connection to: ${url}`);
    
    // Use AbortController for better timeout handling on mobile
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log(`✅ Connection successful: ${url}`);
      return true;
    } else {
      console.log(`❌ Connection failed: ${url} - Status: ${response.status}`);
      return false;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ Connection test failed for ${url}: ${errorMessage}`);
    return false;
  }
}

// 🚀 Smart connection discovery
async function discoverBackendUrl(): Promise<string> {
  const now = Date.now();
  const cacheExpiry = 30000; // 30 seconds cache
  

  
  // Use cache if recent and valid
  if (connectionCache.workingUrl && 
      connectionCache.lastChecked > now - cacheExpiry) {
    console.log(`📡 Using cached ${connectionCache.status} connection: ${connectionCache.workingUrl}`);
    return connectionCache.workingUrl;
  }
  
  console.log('🔍 Discovering backend connection...');
  

  
  // Check if we're on mobile
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  );
  
  console.log('📱 Mobile detection:', { isMobile, userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server-side' });
  
  // Check environment variable first (highest priority)
  const envBackendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  
  // Debug environment variable
  console.log('🔍 Environment variable check:', {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    envBackendUrl: envBackendUrl
  });
  
  // REMOVED ALL RAILWAY DETECTION - We only use Docker backend now
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isTailscale = hostname.includes('.tailscale') || hostname.includes('.ts.net');
  
  console.log('🌐 Environment detection:', {
    hostname: hostname || 'server-side',
    isTailscale,
    isLocalhost,
    envBackendUrl: envBackendUrl ? 'SET' : 'NOT SET'
  });
  
  // ALWAYS use frontend API routes (they forward to Docker backend via http://backend:3001)
  // This works for both Tailscale Funnel and localhost
  // NO RAILWAY - NO EXTERNAL BACKEND - ONLY DOCKER
  console.log(`🌐 Using frontend API routes (Docker backend via http://backend:3001)`);
  connectionCache = {
    workingUrl: '', // Empty = use relative URLs (frontend API routes)
    lastChecked: now,
    status: isTailscale ? 'tailscale' : (isLocalhost ? 'local' : 'docker')
  };
  return ''; // Empty string = use relative URLs (NO RAILWAY EVER)
}

// 📝 Force connection type (for testing)
export function forceConnectionType(type: 'local' | 'environment' | 'auto'): void {
  if (type === 'auto') {
    connectionCache.workingUrl = null;
    connectionCache.lastChecked = 0;
    connectionCache.status = 'unknown';
    console.log('🔄 Switched to AUTO mode - will discover connection');
  } else if (type === 'environment') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (envUrl) {
      connectionCache = {
        workingUrl: envUrl,
        lastChecked: Date.now(),
        status: 'environment'
      };
      console.log(`🔧 Forced ENVIRONMENT connection: ${envUrl}`);
    } else {
      console.warn('⚠️ No environment variable found for backend URL');
    }
  } else {
    const url = CONNECTION_URLS.LOCAL;
    connectionCache = {
      workingUrl: url,
      lastChecked: Date.now(),
      status: type
    };
    console.log(`🔧 Forced ${type.toUpperCase()} connection: ${url}`);
  }
}

// 🚀 Force environment connection immediately (for development)
export function forceEnvironmentConnection(): void {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl) {
    connectionCache = {
      workingUrl: envUrl,
      lastChecked: Date.now(),
      status: 'environment'
    };
    console.log(`🔧 Forced ENVIRONMENT connection: ${envUrl}`);
  } else {
    console.warn('⚠️ No environment variable found for backend URL');
  }
}

// 🎯 Get current connection status
export function getConnectionStatus(): {
  url: string | null;
  type: string;
  lastChecked: Date;
} {
  return {
    url: connectionCache.workingUrl,
    type: connectionCache.status,
    lastChecked: new Date(connectionCache.lastChecked)
  };
}

export const BACKEND_CONFIG: BackendConfig = {
  // 🎯 BACKEND URL - Smart discovery with fallback
  BASE_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 
            process.env.BACKEND_URL || 
            process.env.NEXT_PUBLIC_API_URL ||
            CONNECTION_URLS.LOCAL,
  
  // 📍 API ENDPOINTS - Do not change these unless backend routes change
  ENDPOINTS: {
    GAMES: {
      CREATE: '/api/create',
      JOIN: '/api/join',
      ACTION: '/api/action',
      DETAIL: '/api/game-detail',
    },
    PLAYERS: {
      LOGIN: '/api/players/login',
      REGISTER: '/api/players/register',
      SUGGESTIONS: '/api/players/suggestions',
      STATUS: '/api/players/status',
      RESUME: '/api/players/resume',
      PROFILE: '/api/players/profile',
      DASHBOARD: '/api/players/dashboard',
      HISTORY: '/api/players/history',
    },
    ADMIN: {
      GAMES: '/api/admin/games',
      PLAYERS: '/api/admin/players',
      STORAGE_CONFIG: '/api/admin/storage/config',
      STORAGE_TEST: '/api/admin/storage/test',
    },
    HISTORY: '/api/history',
    LEADERBOARD: '/api/leaderboard',
    TEAMS_LEADERBOARD: '/api/teams/leaderboard',
  },
};

// 🚀 HELPER FUNCTIONS
export function getBackendUrl(): string {
  return BACKEND_CONFIG.BASE_URL;
}

// 🌐 Smart backend URL (with connection discovery)
export async function getSmartBackendUrl(): Promise<string> {
  return await discoverBackendUrl();
}

export function getApiUrl(endpoint: string): string {
  return `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
}

// 🌐 Smart API URL (with connection discovery and retry)
export async function getSmartApiUrl(endpoint: string): Promise<string> {
  const backendUrl = await getSmartBackendUrl();
  // If backendUrl is empty (Tailscale/local), use relative URL (frontend API route)
  if (!backendUrl) {
    return endpoint;
  }
  return `${backendUrl}${endpoint}`;
}

// 🔄 Invalidate cache when connection fails
export function invalidateConnectionCache(): void {
  connectionCache.workingUrl = null;
  connectionCache.lastChecked = 0;
  connectionCache.status = 'unknown';
  console.log('🔄 Connection cache invalidated - will rediscover on next request');
}

// 🚀 Smart fetch with automatic retry and fallback
export async function smartFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  let attempt = 0;
  const maxAttempts = 2;
  
  // Enhanced mobile detection with iOS Safari support
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS|Safari/i.test(navigator.userAgent) ||
    window.innerWidth <= 768 ||
    window.innerHeight <= 600 ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
  );
  
  // iOS Safari specific detection
  const isIOSSafari = typeof window !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) && 
    /Safari/.test(navigator.userAgent) && 
    !/CriOS|FxiOS/.test(navigator.userAgent)
  );
  
  // Check if it's iPhone Chrome browser - use even longer timeout
  const isIPhoneChrome = typeof window !== 'undefined' && 
    /iPhone|iPad|iPod/.test(navigator.userAgent) && 
    /CriOS/.test(navigator.userAgent);
  
  const defaultTimeout = isIPhoneChrome ? 120000 : (isMobile ? 60000 : 15000); // 120s for iPhone Chrome, 60s for mobile, 15s for desktop
  
  // Enhanced mobile debugging
  console.log(`🔧 SmartFetch: Using ${defaultTimeout}ms default timeout for ${isIPhoneChrome ? 'iPhone Chrome' : (isMobile ? 'mobile' : 'desktop')}`);
  console.log(`📱 Mobile Debug:`, {
    userAgent: navigator.userAgent,
    isMobile,
    isIOSSafari,
    isIPhoneChrome,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    hasTouch: 'ontouchstart' in window,
    maxTouchPoints: navigator.maxTouchPoints,
    platform: navigator.platform
  });
  
  // 🎯 Frontend API routes (start with /api/) should use relative URLs
  // Backend API routes use the full backend URL
  const isFrontendRoute = endpoint.startsWith('/api/players/') || 
                          endpoint.startsWith('/api/session/') || 
                          endpoint.startsWith('/api/user/') ||
                          endpoint.startsWith('/api/health') ||
                          endpoint.startsWith('/api/action') ||
                          endpoint.startsWith('/api/game/') ||
                          endpoint.startsWith('/api/create') ||
                          endpoint.startsWith('/api/join') ||
                          endpoint.startsWith('/api/games');
  
  while (attempt < maxAttempts) {
    try {
      let apiUrl: string;
      
      if (isFrontendRoute) {
        // Frontend routes - use relative URL (Next.js API routes)
        apiUrl = endpoint;
        console.log(`🔗 Frontend route - Attempt ${attempt + 1}: ${apiUrl}`);
      } else {
        // Backend routes - use full backend URL (Docker backend)
        apiUrl = await getSmartApiUrl(endpoint);
        console.log(`🔗 Backend route - Attempt ${attempt + 1}: ${apiUrl}`);
      }
      
      const response = await fetch(apiUrl, {
        ...options,
        signal: options.signal || AbortSignal.timeout(defaultTimeout)
      });
      
      // If successful, return response
      if (response.ok) {
        return response;
      }
      
      // If 500+ error, try to fallback (only for backend routes)
      if (response.status >= 500 && !isFrontendRoute) {
        console.warn(`⚠️  Server error ${response.status}, invalidating cache and retrying`);
        invalidateConnectionCache();
        attempt++;
        continue;
      }
      
      // For other errors (400, 401, etc.) or frontend routes, return as-is
      return response;
      
    } catch (error: any) {
      console.warn(`⚠️  Connection failed on attempt ${attempt + 1}:`, error);
      
      // Check if it's a timeout error
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        console.warn(`⏰ Timeout detected on attempt ${attempt + 1}, will retry with longer timeout`);
      }
      
      // Only invalidate cache for backend routes
      if (!isFrontendRoute) {
        invalidateConnectionCache();
      }
      attempt++;
      
      if (attempt >= maxAttempts) {
        throw error;
      }
      
      // Wait briefly before retry, longer for mobile
      const retryDelay = isMobile ? 2000 : 1000;
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  throw new Error('All connection attempts failed');
}

export function getEndpoint(category: keyof typeof BACKEND_CONFIG.ENDPOINTS, action: string): string {
  const categoryEndpoints = BACKEND_CONFIG.ENDPOINTS[category] as any;
  return categoryEndpoints[action] || '';
}

// 🌍 ENVIRONMENT DETECTION
export function getEnvironment(): string {
  if (typeof window !== 'undefined') {
    // Client side
    return window.location.hostname === 'localhost' ? 'development' : 'production';
  }
  // Server side
  return process.env.NODE_ENV || 'development';
}

// 📝 USAGE EXAMPLES:
// 
// import { BACKEND_CONFIG, getSmartApiUrl, forceConnectionType } from '@/lib/backend-config';
// 
// // Smart discovery (recommended)
// const createGameUrl = await getSmartApiUrl(BACKEND_CONFIG.ENDPOINTS.GAMES.CREATE);
// 
// // Force connection type for testing
// forceConnectionType('local');  // Use local backend
// forceConnectionType('online'); // Use online backend
// forceConnectionType('auto');   // Auto-discover (default)
// 
// // Make API call
// fetch(createGameUrl, { method: 'POST', ... })

// 🎯 PRODUCTION DEPLOYMENT GUIDE:
// 
// 1. **Docker Mode (Default)**: Uses frontend API routes which forward to http://backend:3001
// 2. **Local Development**: Uses http://localhost:3001
// 3. **Manual Override**: Set NEXT_PUBLIC_BACKEND_URL in docker-compose.yml
// 
// Environment Variables (set in docker-compose.yml):
// - NEXT_PUBLIC_BACKEND_URL=http://backend:3001 (for Docker network)
// 
// Testing Commands:
// - forceConnectionType('online') - Force online connection
// - forceConnectionType('local') - Force local connection
// - forceConnectionType('auto') - Auto-discover connection 