import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "../components/layout";
import { Bell, Heart, MessageCircle, UserPlus, Bookmark, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Notification } from "@shared/schema";

interface NotificationsPageProps {
  user: any;
  onLogout: () => void;
}

export default function NotificationsPage({ user, onLogout }: NotificationsPageProps) {
  const sessionId = localStorage.getItem('minso_session');
    const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const {
    data: notifications,
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications?limit=50', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      return response.json() as Promise<Notification[]>;
    },
    enabled: !!sessionId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    onError: (error: any) => {
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    onError: (error: any) => {
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="text-red-400" size={20} />;
      case 'comment':
        return <MessageCircle className="text-blue-400" size={20} />;
      case 'follow':
        return <UserPlus className="text-green-400" size={20} />;
      case 'bookmark':
        return <Bookmark className="text-accent-beige" size={20} />;
      default:
        return <Bell className="text-beige-text" size={20} />;
    }
  };

  const formatDateTime = (date: Date | string) => {
    const notificationDate = new Date(date);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    
    return notificationDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: notificationDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read first
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'mention':
        if (notification.relatedPostId) {
          setLocation(`/post/${notification.relatedPostId}`);
        }
        break;
      case 'follow':
        if (notification.relatedUserId) {
          setLocation(`/profile/${notification.relatedUserId}`);
        }
        break;
      default:
        // For other notification types, stay on the same page
        break;
    }
  };

  if (isLoading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-subtle-border rounded-lg p-6 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="h-5 w-5 bg-subtle-border rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-subtle-border rounded mb-2"></div>
                    <div className="h-3 w-1/4 bg-subtle-border rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="text-center py-20">
            <Bell className="mx-auto text-red-400/50 mb-6" size={64} />
            <div className="text-red-400 text-2xl mb-4">Unable to load notifications</div>
            <div className="text-beige-text/50 text-lg">Please check your connection and try again</div>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <Bell className="text-accent-beige" size={32} />
              <h1 className="text-3xl font-bold text-beige-text">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-lg text-beige-text/70">Stay updated with your conversations</p>
          </div>
          
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="bg-accent-beige text-dark-bg hover:bg-accent-beige/90"
            >
              <CheckCheck size={16} className="mr-2" />
              {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
            </Button>
          )}
        </div>
        
        <div className="space-y-4">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification: Notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`border rounded-lg p-6 transition-colors duration-200 cursor-pointer hover:border-accent-beige/50 ${
                  notification.read 
                    ? 'border-subtle-border bg-dark-bg hover:bg-accent-beige/5' 
                    : 'border-accent-beige/30 bg-accent-beige/5 hover:bg-accent-beige/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <p className="text-beige-text leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-beige-text/50">
                          {formatDateTime(notification.createdAt)}
                        </span>
                        {!notification.read && (
                          <span className="text-xs bg-accent-beige text-dark-bg px-2 py-1 rounded-full font-medium">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the notification click
                        markAsReadMutation.mutate(notification.id);
                      }}
                      disabled={markAsReadMutation.isPending}
                      className="text-beige-text/60 hover:text-beige-text"
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20">
              <Bell className="mx-auto text-beige-text/30 mb-6" size={64} />
              <div className="text-beige-text/70 text-2xl mb-4">You have no notifications</div>
              <div className="text-beige-text/50 text-lg">We'll let you know when something happens!</div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
