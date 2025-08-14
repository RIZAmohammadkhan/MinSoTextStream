import { Home, User, ArrowUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ProfileMenu from "./profile-menu";

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [location, setLocation] = useLocation();

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

  return (
    <div className="min-h-screen bg-dark-bg text-beige-text">
      {/* Header */}
      <header className="sticky top-0 bg-dark-bg border-b border-subtle-border z-50">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-accent-beige tracking-tight" data-testid="text-logo">MinSO</h1>
            <nav className="flex items-center space-x-8">
              <button 
                onClick={() => setLocation('/')}
                className={`transition-colors duration-200 ${location === '/' ? 'text-accent-beige' : 'text-beige-text hover:text-accent-beige'}`}
                data-testid="button-home"
              >
                <Home size={22} />
              </button>
              <button 
                onClick={() => setLocation('/search')}
                className={`transition-colors duration-200 ${location === '/search' ? 'text-accent-beige' : 'text-beige-text hover:text-accent-beige'}`}
                data-testid="button-search"
              >
                <Search size={22} />
              </button>
              <ProfileMenu user={user} onLogout={onLogout} />
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