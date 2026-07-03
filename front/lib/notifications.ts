// 🎯 Notification System
// Handles browser notifications and in-app notifications

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'game'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: number
  read: boolean
  actionUrl?: string
}

class NotificationManager {
  private notifications: Notification[] = []
  private listeners: Array<(notifications: Notification[]) => void> = []
  private permission: NotificationPermission = 'default'

  constructor() {
    if (typeof window !== 'undefined') {
      this.permission = Notification.permission
      this.requestPermission()
    }
  }

  // Request browser notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied'
    }

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission()
    }

    return this.permission
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  // Check if permission is granted
  hasPermission(): boolean {
    return this.permission === 'granted'
  }

  // Show browser notification
  private showBrowserNotification(notification: Notification) {
    if (!this.isSupported() || !this.hasPermission()) {
      return
    }

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: false,
        silent: false
      })

      // Click handler
      browserNotification.onclick = () => {
        window.focus()
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl
        }
        browserNotification.close()
      }

      // Auto-close after 5 seconds
      setTimeout(() => {
        browserNotification.close()
      }, 5000)
    } catch (error) {
      console.error('Failed to show browser notification:', error)
    }
  }

  // Add notification
  add(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      read: false
    }

    this.notifications.unshift(newNotification)
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50)
    }

    // Show browser notification if permission granted
    if (this.hasPermission() && notification.type === 'game') {
      this.showBrowserNotification(newNotification)
    }

    // Notify listeners
    this.notifyListeners()

    return newNotification.id
  }

  // Mark notification as read
  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      notification.read = true
      this.notifyListeners()
    }
  }

  // Mark all as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true)
    this.notifyListeners()
  }

  // Remove notification
  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id)
    this.notifyListeners()
  }

  // Clear all notifications
  clear() {
    this.notifications = []
    this.notifyListeners()
  }

  // Get all notifications
  getAll(): Notification[] {
    return this.notifications
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  // Subscribe to notification changes
  subscribe(callback: (notifications: Notification[]) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(callback => callback([...this.notifications]))
  }

  // Convenience methods
  info(title: string, message: string, actionUrl?: string) {
    return this.add({ type: 'info', title, message, actionUrl })
  }

  success(title: string, message: string, actionUrl?: string) {
    return this.add({ type: 'success', title, message, actionUrl })
  }

  warning(title: string, message: string, actionUrl?: string) {
    return this.add({ type: 'warning', title, message, actionUrl })
  }

  error(title: string, message: string, actionUrl?: string) {
    return this.add({ type: 'error', title, message, actionUrl })
  }

  game(title: string, message: string, actionUrl?: string) {
    return this.add({ type: 'game', title, message, actionUrl })
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager()

// Export convenience functions
export const notify = {
  info: (title: string, message: string, actionUrl?: string) => 
    notificationManager.info(title, message, actionUrl),
  success: (title: string, message: string, actionUrl?: string) => 
    notificationManager.success(title, message, actionUrl),
  warning: (title: string, message: string, actionUrl?: string) => 
    notificationManager.warning(title, message, actionUrl),
  error: (title: string, message: string, actionUrl?: string) => 
    notificationManager.error(title, message, actionUrl),
  game: (title: string, message: string, actionUrl?: string) => 
    notificationManager.game(title, message, actionUrl),
}

