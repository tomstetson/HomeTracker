import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNotificationStore, Notification } from '../store/notificationStore';
import { Bell, X, Check, Trash2, AlertCircle, AlertTriangle, Info, Calendar, Package, Wrench } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
// Dialog import removed - not currently used
import { Button } from './ui/Button';

export default function NotificationPanel() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getIcon = (type: Notification['type'], severity: Notification['severity']) => {
    if (severity === 'urgent') return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (severity === 'warning') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    
    switch (type) {
      case 'maintenance':
        return <Wrench className="w-5 h-5 text-blue-500" />;
      case 'warranty':
        return <Package className="w-5 h-5 text-purple-500" />;
      case 'project':
        return <Calendar className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-background border border-border rounded-lg shadow-xl z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    markAllAsRead();
                  }}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearAllNotifications();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No notifications</p>
                <p className="text-sm mt-1">You're all caught up!</p>
              </div>
            ) : (
              <>
                {/* Unread */}
                {unreadNotifications.length > 0 && (
                  <div className="p-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">
                      Unread ({unreadNotifications.length})
                    </h4>
                    {unreadNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onRead={() => markAsRead(notification.id)}
                        onDelete={() => deleteNotification(notification.id)}
                        onClick={() => {
                          markAsRead(notification.id);
                          setIsOpen(false);
                        }}
                        getIcon={getIcon}
                      />
                    ))}
                  </div>
                )}

                {/* Read */}
                {readNotifications.length > 0 && (
                  <div className="p-2 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">
                      Read ({readNotifications.length})
                    </h4>
                    {readNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onRead={() => markAsRead(notification.id)}
                        onDelete={() => deleteNotification(notification.id)}
                        onClick={() => setIsOpen(false)}
                        getIcon={getIcon}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
  onDelete: () => void;
  onClick: () => void;
  getIcon: (type: Notification['type'], severity: Notification['severity']) => React.ReactNode;
}

function NotificationItem({ notification, onRead: _onRead, onDelete, onClick, getIcon }: NotificationItemProps) {
  const content = notification.actionUrl ? (
    <Link
      to={notification.actionUrl}
      onClick={onClick}
      className="block"
    >
      <div className={cn(
        "p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer",
        !notification.read && "bg-primary/5 border-l-2 border-primary"
      )}>
        <div className="flex items-start gap-3">
          {getIcon(notification.type, notification.severity)}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className={cn(
                "text-sm font-medium",
                !notification.read ? "text-foreground" : "text-muted-foreground"
              )}>
                {notification.title}
              </h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 rounded hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(notification.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  ) : (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer group",
        !notification.read && "bg-primary/5 border-l-2 border-primary"
      )}
    >
      <div className="flex items-start gap-3">
        {getIcon(notification.type, notification.severity)}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "text-sm font-medium",
              !notification.read ? "text-foreground" : "text-muted-foreground"
            )}>
              {notification.title}
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDate(notification.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );

  return content;
}

