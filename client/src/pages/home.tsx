import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/components/page-transition";
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
      <motion.main 
        className="max-w-3xl mx-auto px-6 py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <ComposePost user={user} />
        </motion.div>
        
        {/* Feed Toggle */}
        <motion.div 
          className="flex space-x-1 bg-subtle-border/30 rounded-lg p-1 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.button
            onClick={() => setFeedType('discover')}
            className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
              feedType === 'discover'
                ? 'bg-accent-beige text-dark-bg'
                : 'text-beige-text hover:text-beige-text/80'
            }`}
            data-testid="tab-discover"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Discover
          </motion.button>
          <motion.button
            onClick={() => setFeedType('following')}
            className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
              feedType === 'following'
                ? 'bg-accent-beige text-dark-bg'
                : 'text-beige-text hover:text-beige-text/80'
            }`}
            data-testid="tab-following"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Following
          </motion.button>
        </motion.div>
        
        <motion.div 
          className="space-y-12"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {allPosts.map((post: PostWithAuthor, index) => (
            <motion.div
              key={post.id}
              variants={staggerItem}
              layout
            >
              <PostCard
                post={post}
                user={user}
                ref={index === allPosts.length - 1 ? lastPostRef : null}
              />
            </motion.div>
          ))}
          
          {isFetchingNextPage && (
            <motion.div 
              className="flex justify-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-beige-text/60 text-lg">Loading more conversations...</div>
            </motion.div>
          )}
          
          {!hasNextPage && allPosts.length > 0 && (
            <motion.div 
              className="flex justify-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-beige-text/40 text-lg">You've reached the end of the conversation</div>
            </motion.div>
          )}
          
          {allPosts.length === 0 && (
            <motion.div 
              className="text-center py-20"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            >
              <div className="text-beige-text/70 text-2xl mb-4">No conversations yet</div>
              <div className="text-beige-text/50 text-lg">Be the first to start a discussion!</div>
            </motion.div>
          )}
        </motion.div>
      </motion.main>
    </Layout>
  );
}
