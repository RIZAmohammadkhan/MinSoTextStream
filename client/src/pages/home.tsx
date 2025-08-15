import { useEffect, useState } from "react";
import Layout from "../components/layout";
import ComposePost from "../components/compose-post";
import PostCard from "../components/post-card";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useWebSocket } from "../hooks/use-websocket";
import { useInfiniteScroll } from "../hooks/use-infinite-scroll";
import { apiRequest, queryClient } from "../lib/queryClient";
import type { PostWithAuthor } from "@shared/schema";

interface HomeProps {
  user: any;
  onLogout: () => void;
}

export default function Home({ user, onLogout }: HomeProps) {
  const [feedType, setFeedType] = useState<'discover' | 'following'>('discover');
  const sessionId = localStorage.getItem('minso_session');
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['/api/posts', feedType],
    queryFn: async ({ pageParam = 0 }) => {
      const feedParam = feedType === 'following' ? '&feed=following' : '';
      const response = await fetch(`/api/posts?offset=${pageParam}&limit=10${feedParam}`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      return response.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length * 10 : undefined;
    },
    initialPageParam: 0,
  });

  const lastPostRef = useInfiniteScroll({
    loading: isFetchingNextPage,
    hasMore: hasNextPage,
    onLoadMore: fetchNextPage,
  });

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (message: any) => {
      if (message.type === 'NEW_POST') {
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      } else if (message.type === 'POST_LIKED') {
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      } else if (message.type === 'POST_DELETED') {
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      } else if (message.type === 'NEW_COMMENT') {
        queryClient.invalidateQueries({ queryKey: ['/api/posts', message.postId, 'comments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      } else if (message.type === 'COMMENT_LIKED') {
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      }
    }
  });

  const allPosts = data?.pages.flat() || [];

  if (isLoading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="max-w-3xl mx-auto px-6 py-12">
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
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div>
          <ComposePost user={user} />
        </div>
        
        {/* Feed Toggle */}
        <div className="flex space-x-1 bg-subtle-border/30 rounded-lg p-1 mb-12">
          <button
            onClick={() => setFeedType('discover')}
            className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
              feedType === 'discover'
                ? 'bg-accent-beige text-dark-bg'
                : 'text-beige-text hover:text-beige-text/80'
            }`}
            data-testid="tab-discover"
          >
            Discover
          </button>
          <button
            onClick={() => setFeedType('following')}
            className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
              feedType === 'following'
                ? 'bg-accent-beige text-dark-bg'
                : 'text-beige-text hover:text-beige-text/80'
            }`}
            data-testid="tab-following"
          >
            Following
          </button>
        </div>
        
        <div className="space-y-12">
          {allPosts.map((post: PostWithAuthor, index) => (
            <div
              key={post.id}
            >
              <PostCard
                post={post}
                user={user}
                ref={index === allPosts.length - 1 ? lastPostRef : null}
              />
            </div>
          ))}
          
          {isFetchingNextPage && (
            <div className="flex justify-center py-12">
              <div className="text-beige-text/60 text-lg">Loading more conversations...</div>
            </div>
          )}
          
          {!hasNextPage && allPosts.length > 0 && (
            <div className="flex justify-center py-12">
              <div className="text-beige-text/40 text-lg">You've reached the end of the conversation</div>
            </div>
          )}
          
          {allPosts.length === 0 && (
            <div className="text-center py-20">
              <div className="text-beige-text/70 text-2xl mb-4">No conversations yet</div>
              <div className="text-beige-text/50 text-lg">Be the first to start a discussion!</div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
