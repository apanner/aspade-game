// 🎯 Centralized Logger Utility
// Replaces console.log with environment-aware logging

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: number
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logs: LogEntry[] = []
  private maxLogs = 100 // Keep last 100 logs for debugging

  private addLog(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now()
    }

    // Keep only last N logs
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Log to console in development
    if (this.isDevelopment) {
      const emoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌'
      }[level]

      const color = {
        debug: 'color: #888',
        info: 'color: #2196F3',
        warn: 'color: #FF9800',
        error: 'color: #F44336'
      }[level]

      if (data) {
        console.log(`%c${emoji} [${level.toUpperCase()}] ${message}`, color, data)
      } else {
        console.log(`%c${emoji} [${level.toUpperCase()}] ${message}`, color)
      }
    }

    // In production, send errors to error tracking service
    if (!this.isDevelopment && level === 'error') {
      // TODO: Send to error tracking service (Sentry, etc.)
      // this.sendToErrorTracking(entry)
    }
  }

  debug(message: string, data?: any) {
    this.addLog('debug', message, data)
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data)
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data)
  }

  error(message: string, error?: any) {
    this.addLog('error', message, error)
  }

  // Get logs for debugging (dev only)
  getLogs(): LogEntry[] {
    return this.isDevelopment ? this.logs : []
  }

  // Clear logs
  clear() {
    this.logs = []
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for testing
export { Logger }

