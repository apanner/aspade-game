"use client"

import { useState, useEffect } from "react"
import { Bell, Check, X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { notificationManager, type Notification } from "@/lib/notifications"
import { formatDistanceToNow } from "date-fns"

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Subscribe to notification changes
    const unsubscribe = notificationManager.subscribe((notifs) => {
      setNotifications(notifs)
      setUnreadCount(notificationManager.getUnreadCount())
    })

    // Initial load
    setNotifications(notificationManager.getAll())
    setUnreadCount(notificationManager.getUnreadCount())

    return unsubscribe
  }, [])

  const handleMarkAsRead = (id: string) => {
    notificationManager.markAsRead(id)
  }

  const handleMarkAllAsRead = () => {
    notificationManager.markAllAsRead()
  }

  const handleRemove = (id: string) => {
    notificationManager.remove(id)
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case 'game':
        return <Bell className="h-4 w-4 text-blue-400" />
      default:
        return <Info className="h-4 w-4 text-blue-400" />
    }
  }

  const getColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20'
      case 'error':
        return 'bg-red-500/10 border-red-500/20'
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20'
      case 'game':
        return 'bg-blue-500/10 border-blue-500/20'
      default:
        return 'bg-slate-700/30 border-slate-600/50'
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </SheetDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-slate-400 mb-4" />
              <p className="text-slate-300 font-medium">No notifications</p>
              <p className="text-sm text-slate-400 mt-2">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${getColor(notification.type)} ${
                    !notification.read ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-white">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-slate-300 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-2">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemove(notification.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {notification.actionUrl && (
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-2 p-0 h-auto text-xs"
                          onClick={() => {
                            window.location.href = notification.actionUrl!
                            setOpen(false)
                          }}
                        >
                          View →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

