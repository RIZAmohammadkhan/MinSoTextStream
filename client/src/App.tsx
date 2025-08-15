import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "./components/page-transition";
import Home from "./pages/home";
import Auth from "./pages/auth";
import SearchPage from "./pages/search";
import ProfilePage from "./pages/profile";
import TrendingPage from "./pages/trending";
import BookmarksPage from "./pages/bookmarks";
import NotificationsPage from "./pages/notifications";
import MessagesPage from "./pages/messages";
import PostPage from "./pages/post";
import NotFoundPage from "./pages/not-found";

function Router() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const sessionId = localStorage.getItem('minso_session');
    const userData = localStorage.getItem('minso_user');
    
    if (sessionId && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('minso_session');
        localStorage.removeItem('minso_user');
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-dark-bg flex items-center justify-center"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-beige-text text-lg"
        >
          Loading...
        </motion.div>
      </motion.div>
    );
  }

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Auth onLogin={setUser} />
      </motion.div>
    );
  }

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('minso_session');
    localStorage.removeItem('minso_user');
  };

  return (
    <PageTransition>
      <Switch>
        <Route path="/search" component={() => <SearchPage user={user} onLogout={handleLogout} />} />
        <Route path="/profile/:userId?" component={(params) => <ProfilePage user={user} onLogout={handleLogout} userId={params.params?.userId} />} />
        <Route path="/trending" component={() => <TrendingPage user={user} onLogout={handleLogout} />} />
        <Route path="/messages" component={() => <MessagesPage user={user} onLogout={handleLogout} />} />
        <Route path="/bookmarks" component={() => <BookmarksPage user={user} onLogout={handleLogout} />} />
        <Route path="/notifications" component={() => <NotificationsPage user={user} onLogout={handleLogout} />} />
        <Route path="/post/:postId" component={() => <PostPage user={user} />} />
        <Route path="/" component={() => <Home user={user} onLogout={handleLogout} />} />
        <Route path="*" component={() => <NotFoundPage user={user} onLogout={handleLogout} />} />
      </Switch>
    </PageTransition>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster 
          theme="dark"
          position="top-right"
          expand={true}
          richColors={true}
          closeButton={true}
        />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
