import { useState, useRef, useEffect } from "react";
import { User, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

interface ProfileMenuProps {
  user: any;
  onLogout: () => void;
}

export default function ProfileMenu({ user, onLogout }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    setIsOpen(false);
  };

  const goToProfile = () => {
    setLocation('/profile');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 transition-colors duration-200 ${
          location === '/profile' ? 'text-accent-beige' : 'text-beige-text hover:text-accent-beige'
        }`}
        data-testid="button-profile-menu"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <User size={22} />
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="absolute right-0 mt-2 w-48 bg-dark-bg/95 backdrop-blur-md border border-subtle-border rounded-lg shadow-lg py-2 z-50"
            data-testid="profile-menu"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, duration: 0.1 }}
          >
            <motion.button
              onClick={goToProfile}
              className="w-full px-4 py-3 text-left text-beige-text hover:bg-subtle-border/30 transition-colors duration-200 flex items-center space-x-3"
              data-testid="menu-profile"
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <User size={18} />
              <span>Profile</span>
            </motion.button>
            
            <div className="border-t border-subtle-border my-1"></div>
            
            <motion.button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-left text-beige-text hover:bg-subtle-border/30 transition-colors duration-200 flex items-center space-x-3"
              data-testid="menu-logout"
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogOut size={18} />
              <span>Sign out</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}