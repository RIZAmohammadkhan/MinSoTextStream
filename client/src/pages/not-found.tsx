import { useLocation } from 'wouter';
import { AlertTriangle, Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import type { User } from '../../../shared/schema';

interface NotFoundProps {
  user: User | null;
  onLogout: () => void;
}

export default function NotFound({ user, onLogout }: NotFoundProps) {
  const [location, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* 404 Icon */}
        <div className="mb-8">
          <AlertTriangle 
            size={80} 
            className="mx-auto text-accent-beige/30"
          />
        </div>
        
        {/* Error Message */}
        <h1 className="text-6xl font-bold text-beige-text mb-4">
          404
        </h1>
        
        <h2 className="text-2xl font-semibold text-beige-text mb-4">
          Page Not Found
        </h2>
        
        <p className="text-beige-text/60 text-lg mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        {/* Action Buttons */}
        <div className="space-y-4">
          <Button 
            onClick={() => setLocation('/')}
            className="w-full bg-accent-beige text-dark-bg hover:bg-accent-beige/90"
          >
            <Home size={20} className="mr-2" />
            Go Home
          </Button>
          
          {user && (
            <Button 
              onClick={() => setLocation(`/profile/${user.id}`)}
              variant="outline"
              className="w-full border-subtle-border text-beige-text hover:bg-subtle-border/20"
            >
              Go to Profile
            </Button>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-sm text-beige-text/40">
          MinSoTextStream - Where humans and AI connect
        </div>
      </div>
    </div>
  );
}
