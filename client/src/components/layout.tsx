import { Home, User, ArrowUp, Search, Bell, Bookmark, TrendingUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ProfileMenu from "./profile-menu";

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [location, setLocation] = useLocation();

  // Fetch unread notification count
  const { data: notificationData } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch notification count');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: !!user
  });

  // Fetch unread message count
  const { data: messageData } = useQuery({
    queryKey: ['/api/dm/unread-count'],
    queryFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch('/api/dm/unread-count', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch message count');
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds for more responsive messaging
    enabled: !!user
  });

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      const sessionId = localStorage.getItem('minso_session');
      if (sessionId) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionId}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('minso_session');
      localStorage.removeItem('minso_user');
      onLogout();
    }
  };

  const getNavButtonClass = (path: string) => 
    `relative transition-colors duration-200 ${location === path ? 'text-accent-beige' : 'text-beige-text hover:text-accent-beige'}`;

  return (
    <div className="min-h-screen bg-dark-bg text-beige-text">
      {/* Header */}
      <header className="sticky top-0 bg-dark-bg border-b border-subtle-border z-50">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 
              className="text-3xl font-bold text-accent-beige tracking-tight cursor-pointer hover:text-accent-beige/80 transition-colors" 
              onClick={() => setLocation('/')}
              data-testid="text-logo"
            >
              MinSO
            </h1>
            <nav className="flex items-center space-x-6">
              <button 
                onClick={() => setLocation('/')}
                className={getNavButtonClass('/')}
                data-testid="button-home"
                title="Home"
              >
                <Home size={22} />
              </button>
              
              <button 
                onClick={() => setLocation('/search')}
                className={getNavButtonClass('/search')}
                data-testid="button-search"
                title="Search"
              >
                <Search size={22} />
              </button>

              <button 
                onClick={() => setLocation('/trending')}
                className={getNavButtonClass('/trending')}
                data-testid="button-trending"
                title="Trending"
              >
                <TrendingUp size={22} />
              </button>

              <button 
                onClick={() => setLocation('/messages')}
                className={getNavButtonClass('/messages')}
                data-testid="button-messages"
                title="Messages"
              >
                <div className="relative">
                  <Send size={22} />
                  {messageData?.count > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 bg-red-500 hover:bg-red-500"
                    >
                      {messageData.count > 99 ? '99+' : messageData.count}
                    </Badge>
                  )}
                </div>
              </button>

              <button 
                onClick={() => setLocation('/bookmarks')}
                className={getNavButtonClass('/bookmarks')}
                data-testid="button-bookmarks"
                title="Bookmarks"
              >
                <Bookmark size={22} />
              </button>

              <button 
                onClick={() => setLocation('/notifications')}
                className={getNavButtonClass('/notifications')}
                data-testid="button-notifications"
                title="Notifications"
              >
                <div className="relative">
                  <Bell size={22} />
                  {notificationData?.count > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 bg-red-500 hover:bg-red-500"
                    >
                      {notificationData.count > 99 ? '99+' : notificationData.count}
                    </Badge>
                  )}
                </div>
              </button>
              
              <ProfileMenu user={user} onLogout={handleLogout} />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {children}

      {/* Floating Action Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-accent-beige text-dark-bg w-14 h-14 rounded-full shadow-lg hover:bg-accent-beige/90 transition-all duration-200 p-0"
          data-testid="button-scroll-top"
        >
          <ArrowUp size={20} />
        </Button>
      )}
    </div>
  );
}