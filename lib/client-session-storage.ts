
// 🎯 SIMPLE CLIENT-ONLY SESSION STORAGE
// This prevents server file creation and is iPhone Chrome compatible

// Detect iPhone Chrome browser
const isIPhoneChrome = typeof window !== 'undefined' && 
  /iPhone|iPad|iPod/.test(navigator.userAgent) && 
  /CriOS/.test(navigator.userAgent);

export const sessionStorage = {
  // Save player session (client-side only) - iPhone Chrome optimized
  async savePlayerSession(gameId: string, playerId: string, playerName: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    
    const sessionData = {
      gameId,
      playerId,
      playerName,
      timestamp: Date.now(),
      lastActivity: Date.now(),
      isIPhoneChrome: isIPhoneChrome
    };

    try {
      // iPhone Chrome: Save to multiple locations for redundancy
      if (isIPhoneChrome) {
        console.log('📱 iPhone Chrome detected: Saving to multiple locations...');
        
        const storageKeys = [
          'spade_session',
          'spadeSync_session', 
          'game_session',
          'player_session'
        ];
        
        const storages = [window.sessionStorage, window.localStorage];
        let saved = false;
        
        for (const storage of storages) {
          if (storage) {
            for (const key of storageKeys) {
              try {
                storage.setItem(key, JSON.stringify(sessionData));
                console.log(`📱 iPhone Chrome: Saved to ${key}`);
                saved = true;
              } catch (error) {
                console.warn(`⚠️ iPhone Chrome: Failed to save to ${key}:`, error);
              }
            }
          }
        }
        
        if (saved) {
          console.log('✅ iPhone Chrome: Session saved to multiple locations');
          return 'iphone_chrome';
        }
      }
      
      // Standard approach for other browsers
      // Try sessionStorage first (preferred for session data)
      if (window.sessionStorage) {
        try {
          window.sessionStorage.setItem('spade_session', JSON.stringify(sessionData));
          console.log('✅ Session saved to sessionStorage');
          return 'sessionStorage';
        } catch (error) {
          console.warn('⚠️ sessionStorage failed, trying localStorage:', error);
        }
      }
      
      // Fallback to localStorage
      if (window.localStorage) {
        try {
          window.localStorage.setItem('spade_session', JSON.stringify(sessionData));
          console.log('✅ Session saved to localStorage');
          return 'localStorage';
        } catch (error) {
          console.error('❌ localStorage also failed:', error);
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to save session:', error);
      return null;
    }
  },

  // Get player session (client-side only) - iPhone Chrome optimized
  async getPlayerSession(): Promise<{ gameId: string; playerId: string; playerName: string } | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      // iPhone Chrome: Check multiple locations
      if (isIPhoneChrome) {
        console.log('📱 iPhone Chrome detected: Checking multiple locations...');
        
        const storageKeys = [
          'spade_session',
          'spadeSync_session', 
          'game_session',
          'player_session'
        ];
        
        const storages = [window.sessionStorage, window.localStorage];
        
        for (const storage of storages) {
          if (storage) {
            for (const key of storageKeys) {
              try {
                const data = storage.getItem(key);
                if (data) {
                  const session = JSON.parse(data);
                  console.log(`📱 iPhone Chrome: Retrieved from ${key}`);
                  
                  // Update timestamp to keep session fresh
                  session.lastActivity = Date.now();
                  try {
                    storage.setItem(key, JSON.stringify(session));
                  } catch (e) {
                    console.warn('⚠️ Failed to update iPhone Chrome session timestamp:', e);
                  }
                  
                  return session;
                }
              } catch (error) {
                console.warn(`⚠️ iPhone Chrome: Failed to read from ${key}:`, error);
              }
            }
          }
        }
      }
      
      // Standard approach for other browsers
      // Try sessionStorage first
      if (window.sessionStorage) {
        try {
          const data = window.sessionStorage.getItem('spade_session');
          if (data) {
            const session = JSON.parse(data);
            console.log('✅ Session retrieved from sessionStorage');
            return session;
          }
        } catch (error) {
          console.warn('⚠️ sessionStorage read failed:', error);
        }
      }
      
      // Fallback to localStorage
      if (window.localStorage) {
        try {
          const data = window.localStorage.getItem('spade_session');
          if (data) {
            const session = JSON.parse(data);
            console.log('✅ Session retrieved from localStorage');
            return session;
          }
        } catch (error) {
          console.warn('⚠️ localStorage read failed:', error);
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get session:', error);
      return null;
    }
  },

  // Clear player session (client-side only) - iPhone Chrome optimized
  async clearPlayerSession(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      // iPhone Chrome: Clear from all locations
      if (isIPhoneChrome) {
        console.log('📱 iPhone Chrome detected: Clearing from all locations...');
        
        const storageKeys = [
          'spade_session',
          'spadeSync_session', 
          'game_session',
          'player_session'
        ];
        
        const storages = [window.sessionStorage, window.localStorage];
        
        for (const storage of storages) {
          if (storage) {
            for (const key of storageKeys) {
              try {
                storage.removeItem(key);
                console.log(`📱 iPhone Chrome: Cleared ${key}`);
              } catch (error) {
                console.warn(`⚠️ iPhone Chrome: Failed to clear ${key}:`, error);
              }
            }
          }
        }
      } else {
        // Standard approach for other browsers
        if (window.sessionStorage) {
          try {
            window.sessionStorage.removeItem('spade_session');
          } catch (error) {
            console.warn('⚠️ Failed to clear sessionStorage:', error);
          }
        }
        if (window.localStorage) {
          try {
            window.localStorage.removeItem('spade_session');
          } catch (error) {
            console.warn('⚠️ Failed to clear localStorage:', error);
          }
        }
      }
      
      console.log('✅ Session cleared');
    } catch (error) {
      console.error('❌ Failed to clear session:', error);
    }
  },

  // Save player name only (client-side only) - iPhone Chrome optimized
  async savePlayerName(playerName: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const data = { 
        playerName, 
        timestamp: Date.now(),
        isIPhoneChrome: isIPhoneChrome
      };
      
      // iPhone Chrome: Save to multiple locations
      if (isIPhoneChrome) {
        console.log('📱 iPhone Chrome detected: Saving player name to multiple locations...');
        
        const storageKeys = [
          'spade_player',
          'spadeSync_player',
          'player_name'
        ];
        
        const storages = [window.sessionStorage, window.localStorage];
        
        for (const storage of storages) {
          if (storage) {
            for (const key of storageKeys) {
              try {
                storage.setItem(key, JSON.stringify(data));
                console.log(`📱 iPhone Chrome: Player name saved to ${key}`);
              } catch (error) {
                console.warn(`⚠️ iPhone Chrome: Failed to save player name to ${key}:`, error);
              }
            }
          }
        }
      } else {
        // Standard approach for other browsers
        if (window.sessionStorage) {
          try {
            window.sessionStorage.setItem('spade_player', JSON.stringify(data));
          } catch (error) {
            console.warn('⚠️ Failed to save player name to sessionStorage:', error);
          }
        } else if (window.localStorage) {
          try {
            window.localStorage.setItem('spade_player', JSON.stringify(data));
          } catch (error) {
            console.warn('⚠️ Failed to save player name to localStorage:', error);
          }
        }
      }
      
      console.log('✅ Player name saved');
    } catch (error) {
      console.error('❌ Failed to save player name:', error);
    }
  },

  // Get player name (client-side only) - iPhone Chrome optimized
  async getPlayerName(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      // iPhone Chrome: Check multiple locations
      if (isIPhoneChrome) {
        console.log('📱 iPhone Chrome detected: Checking multiple locations for player name...');
        
        const storageKeys = [
          'spade_player',
          'spadeSync_player',
          'player_name'
        ];
        
        const storages = [window.sessionStorage, window.localStorage];
        
        for (const storage of storages) {
          if (storage) {
            for (const key of storageKeys) {
              try {
                const data = storage.getItem(key);
                if (data) {
                  const playerData = JSON.parse(data);
                  console.log(`📱 iPhone Chrome: Player name retrieved from ${key}`);
                  return playerData.playerName;
                }
              } catch (error) {
                console.warn(`⚠️ iPhone Chrome: Failed to read player name from ${key}:`, error);
              }
            }
          }
        }
      } else {
        // Standard approach for other browsers
        if (window.sessionStorage) {
          try {
            const data = window.sessionStorage.getItem('spade_player');
            if (data) {
              const playerData = JSON.parse(data);
              return playerData.playerName;
            }
          } catch (error) {
            console.warn('⚠️ Failed to read player name from sessionStorage:', error);
          }
        }
        
        if (window.localStorage) {
          try {
            const data = window.localStorage.getItem('spade_player');
            if (data) {
              const playerData = JSON.parse(data);
              return playerData.playerName;
            }
          } catch (error) {
            console.warn('⚠️ Failed to read player name from localStorage:', error);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get player name:', error);
      return null;
    }
  }
};
