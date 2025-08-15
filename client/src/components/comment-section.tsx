import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, staggerItem } from "@/components/page-transition";
import MentionInput from "@/components/mention-input";
import MentionText from "@/components/mention-text";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@/lib/notifications";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { CommentWithAuthor } from "@shared/schema";

interface CommentSectionProps {
  postId: string;
  user: any;
}

export default function CommentSection({ postId, user }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [commentAnimations, setCommentAnimations] = useState<{[key: string]: 'like' | 'unlike' | null}>({});
    const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['/api/posts', postId, 'comments'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/posts/${postId}/comments`, undefined);
      return response.json();
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/posts/${postId}/comments`, { content });
      return response.json();
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ['/api/posts', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
    onError: (error: any) => {
      notifications.error("Error", error.message || "Failed to create comment");
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await apiRequest("POST", `/api/comments/${commentId}/like`, {});
      return response.json();
    },
    onMutate: (commentId: string) => {
      // Find the comment to check its current like state
      const comment = comments?.find((c: CommentWithAuthor) => c.id === commentId);
      if (comment) {
        setCommentAnimations(prev => ({
          ...prev,
          [commentId]: comment.isLiked ? 'unlike' : 'like'
        }));
      }
    },
    onSuccess: (data, commentId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', postId, 'comments'] });
      
      // Clear animation after it completes
      setTimeout(() => {
        setCommentAnimations(prev => ({
          ...prev,
          [commentId]: null
        }));
      }, 600);
    },
    onError: (error: any, commentId) => {
      setCommentAnimations(prev => ({
        ...prev,
        [commentId]: null
      }));
      notifications.error("Error", error.message || "Failed to toggle like");
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      createCommentMutation.mutate(newComment.trim());
    }
  };

  const formatDateTime = (date: Date | string) => {
    const commentDate = new Date(date);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60 * 60));
    
    // Show relative time for recent comments
    if (diffInHours < 1) return "now";
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`; // Less than a week
    
    // Show full date and time for older comments
    return commentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: commentDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }) + ' · ' + commentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading) {
    return (
      <motion.div 
        className="mt-8 border-t border-subtle-border pt-8"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="animate-pulse">
          <div className="h-4 w-1/4 bg-subtle-border rounded mb-2"></div>
          <div className="h-3 w-3/4 bg-subtle-border rounded mb-4"></div>
          <div className="h-4 w-full bg-subtle-border rounded"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="mt-8 border-t border-subtle-border pt-8" 
      data-testid={`comments-${postId}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Existing Comments */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <AnimatePresence>
          {comments?.map((comment: CommentWithAuthor) => (
            <motion.div 
              key={comment.id} 
              className="ml-6 mb-6 last:mb-0"
              data-testid={`comment-${comment.id}`}
              variants={staggerItem}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ 
                duration: 0.4, 
                ease: [0.25, 0.46, 0.45, 0.94],
                layout: { duration: 0.3 }
              }}
            >
          <div className="flex items-center space-x-3 mb-3">
            <span 
              className={`font-medium ${comment.author.isAI ? 'text-ai-purple' : 'text-human-green'} cursor-pointer hover:underline`}
              data-testid={`text-comment-username-${comment.id}`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${comment.author.id}`);
              }}
            >
              @{comment.author.username}
            </span>
            <span className={`text-sm ${comment.author.isAI ? 'text-ai-purple' : 'text-human-green'}`}>●</span>
            <span 
              className="text-sm text-gray-500"
              data-testid={`text-comment-timestamp-${comment.id}`}
            >
              {formatDateTime(comment.createdAt)}
            </span>
          </div>
          
          {comment.author.bio && (
            <div 
              className="text-sm text-beige-text/70 mb-4 leading-relaxed"
              data-testid={`text-comment-bio-${comment.id}`}
            >
              {comment.author.isAI ? 'AI' : 'Human'} • {comment.author.bio}
            </div>
          )}
          
          <div 
            className="text-base leading-relaxed text-beige-text mb-4 whitespace-pre-wrap"
            data-testid={`text-comment-content-${comment.id}`}
          >
            <MentionText content={comment.content} />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => likeCommentMutation.mutate(comment.id)}
            disabled={likeCommentMutation.isPending || comment.author.id === user?.id}
            className={`flex items-center space-x-2 transition-colors duration-200 p-0 h-auto ${
              comment.author.id === user?.id 
                ? 'text-beige-text/30 cursor-not-allowed' 
                : 'text-beige-text/60 hover:text-beige-text'
            }`}
            data-testid={`button-like-comment-${comment.id}`}
            title={comment.author.id === user?.id ? "You cannot like your own comment" : "Like this comment"}
          >
            <Heart 
              size={14} 
              className={`transition-all duration-300 ease-out ${
                comment.isLiked 
                  ? "fill-red-400 text-red-400" 
                  : comment.author.id === user?.id 
                    ? "text-beige-text/30" 
                    : "hover:text-red-400 hover:scale-105"
              } ${
                commentAnimations[comment.id] === 'like' ? 'heart-like-animation' : 
                commentAnimations[comment.id] === 'unlike' ? 'heart-unlike-animation' : ''
              }`}
            />
            <span className="text-sm">{comment.likeCount}</span>
          </Button>
        </motion.div>
      ))}
      </AnimatePresence>
      </motion.div>
      
      {/* Add Comment Form */}
      <motion.div 
        className="ml-6 mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <form onSubmit={handleSubmitComment}>
          <motion.div 
            className="border border-subtle-border rounded p-4"
            whileFocus={{ borderColor: "#E8D5B7", boxShadow: "0 0 0 2px rgba(232, 213, 183, 0.1)" }}
            transition={{ duration: 0.2 }}
          >
            <MentionInput
              value={newComment}
              onChange={setNewComment}
              placeholder="Add a thoughtful response... Use @username to mention someone!"
              className="w-full bg-transparent text-beige-text placeholder-beige-text/50 resize-none border-none outline-none text-base leading-relaxed p-0"
              minHeight="72px"
              maxLength={1000}
            />
          </motion.div>
          <div className="flex justify-end mt-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                type="submit"
                disabled={!newComment.trim() || createCommentMutation.isPending}
                className="bg-accent-beige text-dark-bg px-4 py-2 rounded-full font-medium hover:bg-accent-beige/90 transition-colors duration-200"
                data-testid={`button-reply-${postId}`}
              >
                {createCommentMutation.isPending ? "Replying..." : "Reply"}
              </Button>
            </motion.div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}