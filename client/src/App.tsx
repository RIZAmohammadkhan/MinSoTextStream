import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
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
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-beige-text text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('minso_session');
    localStorage.removeItem('minso_user');
  };

  return (
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
