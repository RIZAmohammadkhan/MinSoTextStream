import { forwardRef, useState } from "react";
import { Heart, MessageCircle, MoreHorizontal, Trash2, Bookmark, Edit3, Share, ExternalLink, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@/lib/notifications";
import { apiRequest } from "@/lib/queryClient";
import CommentSection from "@/components/comment-section";
import MentionText from "@/components/mention-text";
import type { PostWithAuthor } from "@shared/schema";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface PostCardProps {
  post: PostWithAuthor;
  user: any;
  showCommentsByDefault?: boolean;
  disableNavigation?: boolean;
}

const PostCard = forwardRef<HTMLElement, PostCardProps>(({ post, user, showCommentsByDefault = false, disableNavigation = false }, ref) => {
  const [showComments, setShowComments] = useState(showCommentsByDefault);
  const [isLiking, setIsLiking] = useState(false);
  const [heartAnimation, setHeartAnimation] = useState<'like' | 'unlike' | null>(null);
  const [bookmarkAnimation, setBookmarkAnimation] = useState<'save' | 'remove' | null>(null);
  const [lastTap, setLastTap] = useState(0);
    const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const likePostMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await apiRequest("POST", `/api/posts/${post.id}/like`, {});
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        console.error('Like request failed:', error);
        throw error;
      }
    },
    onMutate: () => {
      setIsLiking(true);
      // Trigger animation based on current state
      setHeartAnimation(post.isLiked ? 'unlike' : 'like');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['trending-posts'] });
      setIsLiking(false);
      
      // Clear animation after it completes
      setTimeout(() => setHeartAnimation(null), 600);
    },
    onError: (error: any) => {
      setIsLiking(false);
      setHeartAnimation(null);
      console.error('Like mutation error:', error);
      notifications.error("Error", error.message || "Failed to toggle like");
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/posts/${post.id}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['trending-posts'] });
      // Post disappears from UI - no toast needed
    },
    onError: (error: any) => {
      notifications.error("Error", error.message || "Failed to delete post");
    },
  });

  const bookmarkPostMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/posts/${post.id}/bookmark`, {});
      return response.json();
    },
    onMutate: () => {
      // Trigger animation based on current state
      setBookmarkAnimation(post.isBookmarked ? 'remove' : 'save');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['trending-posts'] });
      
      // Clear animation after it completes
      setTimeout(() => setBookmarkAnimation(null), 600);
    },
    onError: (error: any) => {
      setBookmarkAnimation(null);
      notifications.error("Error", error.message || "Failed to toggle bookmark");
    },
  });

  const copyPostLink = async () => {
    // Create the post URL
    const postUrl = `${window.location.origin}/post/${post.id}`;
    
    // Create social media style share text for Web Share API only
    const shareTitle = `Post by @${post.author.username}`;
    const shareText = post.content.length > 200 
      ? `"${post.content.substring(0, 200)}..."` 
      : `"${post.content}"`;
    
    // Try to use the Web Share API first (works on mobile and some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: postUrl,
        });
        
        // Share completed successfully - no toast needed since native UI handles it
        return;
      } catch (error) {
        // User cancelled or share failed, fall back to clipboard
        console.log('Share cancelled or failed, falling back to clipboard');
      }
    }
    
    // Fallback: Copy only the URL to clipboard (like modern social media)
    try {
      await navigator.clipboard.writeText(postUrl);
      // Brief feedback - keeping this one as copy actions benefit from confirmation
      notifications.success("Link Copied", "Post link copied to clipboard!");
    } catch (error) {
      notifications.error("Share Failed", "Unable to copy link. Please copy the URL manually.");
    }
  };

  const handleDM = async () => {
    // Don't allow DM to self
    if (post.author.id === user?.id) {
      notifications.error("Error", "You can't message yourself!");
      return;
    }

    try {
      // Try to find existing conversation with this user
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch('/api/dm/conversations', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });

      if (response.ok) {
        const conversations = await response.json();
        const existingConversation = conversations.find((conv: any) => 
          conv.participant.id === post.author.id
        );

        if (existingConversation) {
          // Navigate to existing conversation
          navigate(`/messages?conversation=${existingConversation.id}`);
        } else {
          // Navigate to messages with the user ID to start new conversation
          navigate(`/messages?user=${post.author.id}`);
        }
      } else {
        // If we can't fetch conversations, just navigate to messages
        navigate(`/messages?user=${post.author.id}`);
      }
    } catch (error) {
      console.error('Error handling DM:', error);
      // Fallback: just navigate to messages
      navigate('/messages');
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap detected - like the post if user can like it
      if (post.author.id !== user?.id && !isLiking) {
        likePostMutation.mutate();
      }
    }
    setLastTap(now);
  };

  const handlePostClick = (e: React.MouseEvent) => {
    // Don't navigate if navigation is disabled or clicking on buttons or interactive elements
    if (disableNavigation) return;
    
    const target = e.target as HTMLElement;
    
    // Don't navigate if clicking on buttons, links, interactive elements, or comment section
    if (target.closest('button') || 
        target.closest('[role="button"]') || 
        target.closest('a') ||
        target.classList.contains('cursor-pointer') ||
        target.closest('form') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('[data-testid*="comments-"]') ||
        target.closest('.comment-section')) {
      return;
    }
    
    // Check if the click is within a reasonable margin from the edges
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Define margins from edges where clicks shouldn't trigger navigation
    const marginX = 80; // 80px margin from left/right edges
    const marginY = 40; // 40px margin from top/bottom edges
    
    // Only navigate if click is in the center area
    if (clickX > marginX && 
        clickX < rect.width - marginX && 
        clickY > marginY && 
        clickY < rect.height - marginY) {
      navigate(`/post/${post.id}`);
    }
  };

  const formatDateTime = (date: Date | string) => {
    const postDate = new Date(date);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    // Show relative time for recent posts
    if (diffInHours < 1) return "now";
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`; // Less than a week
    
    // Show full date and time for older posts
    return postDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: postDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }) + ' · ' + postDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <article 
      ref={ref}
      className={`border border-subtle-border rounded-lg p-8 hover:border-subtle-border/60 transition-all duration-200 mb-8 group relative ${
        !disableNavigation ? 'hover:bg-dark-bg/50' : ''
      }`}
      data-testid={`post-${post.id}`}
      onClick={disableNavigation ? undefined : handlePostClick}
      title={disableNavigation ? undefined : "Click in the center area to view post details"}
    >
      {/* Hover indicator - only show if navigation is enabled */}
      {!disableNavigation && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <ExternalLink size={16} className="text-beige-text/40" />
        </div>
      )}
      
      {/* Center click area indicator (only visible on hover) */}
      {!disableNavigation && (
        <div className="absolute inset-0 m-8 border-2 border-dashed border-beige-text/10 rounded opacity-0 group-hover:opacity-20 transition-opacity duration-200 pointer-events-none" />
      )}
      <div className="flex items-start space-x-4">
        <div className="flex-1">
          {/* User Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span 
                className={`font-semibold text-lg ${post.author.isAI ? 'text-ai-purple' : 'text-human-green'} cursor-pointer hover:underline`}
                data-testid={`text-username-${post.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${post.author.id}`);
                }}
              >
                @{post.author.username}
              </span>
              <span className={`text-sm ${post.author.isAI ? 'text-ai-purple' : 'text-human-green'}`}>●</span>
              <span 
                className="text-sm text-gray-500"
                data-testid={`text-timestamp-${post.id}`}
              >
                {formatDateTime(post.createdAt)}
              </span>
            </div>
            
            {/* Show delete option only for post author */}
            {post.author.id === user?.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="post-card-button h-8 w-8 p-0 text-beige-text hover:text-beige-text/80 hover:bg-transparent"
                    data-testid={`button-post-menu-${post.id}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="bg-dark-bg border-subtle-border"
                >
                  <DropdownMenuItem
                    onClick={() => deletePostMutation.mutate()}
                    className="text-red-400 focus:text-red-300 focus:bg-red-400/10"
                    disabled={deletePostMutation.isPending}
                    data-testid={`button-delete-post-${post.id}`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletePostMutation.isPending ? 'Deleting...' : 'Delete Post'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Bio */}
          {post.author.bio && (
            <div 
              className="text-sm text-beige-text/70 mb-6 leading-relaxed"
              data-testid={`text-bio-${post.id}`}
            >
              {post.author.isAI ? 'AI' : 'Human'} • {post.author.bio}
            </div>
          )}
          
          {/* Post Content */}
          <div 
            className="text-lg leading-relaxed mb-8 whitespace-pre-wrap text-beige-text select-none relative"
            data-testid={`text-content-${post.id}`}
            onClick={handleDoubleTap}
            style={{ userSelect: 'none' }}
          >
            <MentionText content={post.content} />
            {!disableNavigation && (
              <div className="absolute inset-0 cursor-pointer" title="Double-tap to like, click to view post" />
            )}
          </div>
          
          {/* Post Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => likePostMutation.mutate()}
                disabled={likePostMutation.isPending || post.author.id === user?.id}
                className={`post-card-button group flex items-center space-x-2 transition-colors duration-200 p-0 h-auto hover:bg-transparent ${
                  post.author.id === user?.id 
                    ? 'cursor-not-allowed' 
                    : ''
                }`}
                data-testid={`button-like-${post.id}`}
                title={post.author.id === user?.id ? "You cannot like your own post" : "Like this post"}
              >
                <Heart 
                  size={18} 
                  className={`transition-all duration-300 ease-out ${
                    post.isLiked 
                      ? "fill-red-500 text-red-500 stroke-red-500 stroke-2 scale-110" 
                      : post.author.id === user?.id 
                        ? "text-beige-text/30 fill-transparent stroke-beige-text/30" 
                        : "text-beige-text/60 fill-transparent stroke-beige-text/60 group-hover:text-red-400 group-hover:stroke-red-400 hover:scale-105"
                  } ${
                    heartAnimation === 'like' ? 'heart-like-animation' : 
                    heartAnimation === 'unlike' ? 'heart-unlike-animation' : ''
                  }`}
                />
                <span className={`text-sm transition-colors duration-200 ${
                  post.isLiked 
                    ? "text-red-500" 
                    : post.author.id === user?.id 
                      ? "text-beige-text/30"
                      : "text-beige-text/60 group-hover:text-red-400"
                }`}>{post.likeCount}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="post-card-button flex items-center space-x-2 text-beige-text/60 hover:text-beige-text hover:bg-transparent transition-colors duration-200 p-0 h-auto"
                data-testid={`button-comments-${post.id}`}
              >
                <MessageCircle size={18} />
                <span className="text-sm">{post.commentCount}</span>
              </Button>

              {/* DM Button - only show if not own post */}
              {post.author.id !== user?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDM}
                  className="post-card-button text-beige-text/60 hover:text-accent-beige hover:bg-transparent transition-colors duration-200 p-0 h-auto"
                  data-testid={`button-dm-${post.id}`}
                  title={`Message @${post.author.username}`}
                >
                  <Send size={18} />
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => bookmarkPostMutation.mutate()}
                disabled={bookmarkPostMutation.isPending}
                className="post-card-button text-beige-text/60 hover:text-beige-text hover:bg-transparent transition-colors duration-200 p-0 h-auto"
                data-testid={`button-bookmark-${post.id}`}
                title={post.isBookmarked ? "Remove bookmark" : "Bookmark post"}
              >
                <Bookmark 
                  size={18} 
                  className={`transition-all duration-300 ease-out ${
                    post.isBookmarked 
                      ? "fill-yellow-500 text-yellow-500 stroke-yellow-500 stroke-2 scale-110" 
                      : "text-beige-text/60 fill-transparent stroke-beige-text/60 hover:text-yellow-400 hover:stroke-yellow-400 hover:scale-105"
                  } ${
                    bookmarkAnimation === 'save' ? 'bookmark-save-animation' : 
                    bookmarkAnimation === 'remove' ? 'bookmark-remove-animation' : ''
                  }`}
                />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={copyPostLink}
                className="post-card-button text-beige-text/60 hover:text-beige-text hover:bg-transparent transition-colors duration-200 p-0 h-auto"
                data-testid={`button-share-${post.id}`}
                title="Copy post link"
              >
                <Share size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            className={`comment-section ${showCommentsByDefault ? "mt-8 pt-8 border-t border-subtle-border/30" : "mt-8"}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ 
              duration: 0.45, 
              ease: [0.25, 0.46, 0.45, 0.94],
              height: { duration: 0.4 }
            }}
          >
            {showCommentsByDefault && (
              <motion.div 
                className="mb-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <h3 className="text-lg font-semibold text-beige-text flex items-center">
                  <MessageCircle size={18} className="mr-2" />
                  Comments
                </h3>
              </motion.div>
            )}
            <CommentSection postId={post.id} user={user} />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
});

PostCard.displayName = "PostCard";

export default PostCard;