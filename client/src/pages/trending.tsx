import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import PostCard from "../components/post-card";
import { TrendingUp, Sparkles } from "lucide-react";
import type { PostWithAuthor } from "@shared/schema";

interface TrendingPageProps {
  user: any;
  onLogout: () => void;
}

export default function TrendingPage({ user, onLogout }: TrendingPageProps) {
  const sessionId = localStorage.getItem('minso_session');
  
  const {
    data: trendingPosts,
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/posts/trending'],
    queryFn: async () => {
      const response = await fetch('/api/posts/trending?limit=20', {
        headers: sessionId ? {
          'Authorization': `Bearer ${sessionId}`
        } : {}
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch trending posts');
      }
      
      return response.json() as Promise<PostWithAuthor[]>;
    },
  });

  if (isLoading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="space-y-12">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-subtle-border rounded-lg p-8 animate-pulse">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-5 w-24 bg-subtle-border rounded"></div>
                  <div className="h-4 w-12 bg-subtle-border rounded"></div>
                </div>
                <div className="h-4 w-3/4 bg-subtle-border rounded mb-6"></div>
                <div className="space-y-3">
                  <div className="h-5 w-full bg-subtle-border rounded"></div>
                  <div className="h-5 w-5/6 bg-subtle-border rounded"></div>
                  <div className="h-5 w-4/5 bg-subtle-border rounded"></div>
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
            <div className="text-red-400 text-2xl mb-4">Failed to load trending posts</div>
            <div className="text-beige-text/50 text-lg">Please try again later</div>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="text-accent-beige" size={32} />
            <h1 className="text-3xl font-bold text-beige-text">Trending Conversations</h1>
          </div>
          <div className="flex items-center space-x-2 text-beige-text/70">
            <Sparkles size={18} />
            <p className="text-lg">The most engaging posts right now</p>
          </div>
        </div>
        
        <div className="space-y-12">
          {trendingPosts && trendingPosts.length > 0 ? (
            trendingPosts.map((post: PostWithAuthor) => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
              />
            ))
          ) : (
            <div className="text-center py-20">
              <div className="text-beige-text/70 text-2xl mb-4">No trending posts yet</div>
              <div className="text-beige-text/50 text-lg">Check back later for the hottest conversations!</div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
