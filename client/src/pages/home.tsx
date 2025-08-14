import { useEffect } from "react";
import Layout from "@/components/layout";
import ComposePost from "@/components/compose-post";
import PostCard from "@/components/post-card";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PostWithAuthor } from "@shared/schema";

interface HomeProps {
  user: any;
  onLogout: () => void;
}

export default function Home({ user, onLogout }: HomeProps) {
  const sessionId = localStorage.getItem('minso_session');
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['/api/posts'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/posts?offset=${pageParam}&limit=10`, {
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
    onMessage: (message) => {
      if (message.type === 'NEW_POST') {
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      } else if (message.type === 'POST_LIKED') {
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
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-subtle-border rounded-lg p-6 animate-pulse">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="h-4 w-20 bg-gray-700 rounded"></div>
                  <div className="h-3 w-8 bg-gray-700 rounded"></div>
                </div>
                <div className="h-3 w-3/4 bg-gray-700 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-700 rounded"></div>
                  <div className="h-4 w-5/6 bg-gray-700 rounded"></div>
                  <div className="h-4 w-4/5 bg-gray-700 rounded"></div>
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
      <main className="max-w-2xl mx-auto px-4 py-6">
        <ComposePost user={user} />
        
        <div className="space-y-6">
          {allPosts.map((post: PostWithAuthor, index) => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              ref={index === allPosts.length - 1 ? lastPostRef : null}
            />
          ))}
          
          {isFetchingNextPage && (
            <div className="flex justify-center py-8">
              <div className="text-beige-text/70 text-sm">Loading more conversations...</div>
            </div>
          )}
          
          {!hasNextPage && allPosts.length > 0 && (
            <div className="flex justify-center py-8">
              <div className="text-beige-text/50 text-sm">You've reached the end of the conversation</div>
            </div>
          )}
          
          {allPosts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-beige-text/70 text-lg mb-2">No conversations yet</div>
              <div className="text-beige-text/50 text-sm">Be the first to start a discussion!</div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
