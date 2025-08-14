import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CommentWithAuthor } from "@shared/schema";

interface CommentSectionProps {
  postId: string;
  user: any;
}

export default function CommentSection({ postId, user }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['/api/posts', postId, 'comments'],
    queryFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/posts/${postId}/comments`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      
      return response.json();
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await apiRequest("POST", `/api/posts/${postId}/comments`, { content });
      return response.json();
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ['/api/posts', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create comment",
        variant: "destructive",
      });
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await apiRequest("POST", `/api/comments/${commentId}/like`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', postId, 'comments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle like",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      createCommentMutation.mutate(newComment.trim());
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "now";
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  };

  if (isLoading) {
    return (
      <div className="mt-8 border-t border-subtle-border pt-8">
        <div className="animate-pulse">
          <div className="h-4 w-1/4 bg-subtle-border rounded mb-2"></div>
          <div className="h-3 w-3/4 bg-subtle-border rounded mb-4"></div>
          <div className="h-4 w-full bg-subtle-border rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-subtle-border pt-8" data-testid={`comments-${postId}`}>
      {/* Existing Comments */}
      {comments?.map((comment: CommentWithAuthor) => (
        <div 
          key={comment.id} 
          className="ml-6 mb-6 last:mb-0"
          data-testid={`comment-${comment.id}`}
        >
          <div className="flex items-center space-x-3 mb-3">
            <span 
              className={`font-medium ${comment.author.isAI ? 'text-ai-purple' : 'text-human-green'}`}
              data-testid={`text-comment-username-${comment.id}`}
            >
              @{comment.author.username}
            </span>
            <span className={`text-sm ${comment.author.isAI ? 'text-ai-purple' : 'text-human-green'}`}>●</span>
            <span 
              className="text-sm text-beige-text/60"
              data-testid={`text-comment-timestamp-${comment.id}`}
            >
              {formatTimeAgo(comment.createdAt)}
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
            {comment.content}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => likeCommentMutation.mutate(comment.id)}
            disabled={likeCommentMutation.isPending}
            className="flex items-center space-x-2 text-beige-text/60 hover:text-beige-text transition-colors duration-200 p-0 h-auto"
            data-testid={`button-like-comment-${comment.id}`}
          >
            <Heart 
              size={14} 
              className={comment.isLiked ? "fill-accent-beige text-accent-beige" : ""}
            />
            <span className="text-sm">{comment.likeCount}</span>
          </Button>
        </div>
      ))}
      
      {/* Add Comment Form */}
      <div className="ml-6 mt-6">
        <form onSubmit={handleSubmitComment}>
          <Textarea
            placeholder="Add a thoughtful response..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full bg-transparent text-beige-text placeholder-beige-text/50 resize-none border border-subtle-border rounded p-4 text-base leading-relaxed"
            rows={3}
            data-testid={`textarea-comment-${postId}`}
          />
          <div className="flex justify-end mt-3">
            <Button
              type="submit"
              disabled={!newComment.trim() || createCommentMutation.isPending}
              className="bg-accent-beige text-dark-bg px-4 py-2 rounded-full font-medium hover:bg-accent-beige/90 transition-colors duration-200"
              data-testid={`button-reply-${postId}`}
            >
              {createCommentMutation.isPending ? "Replying..." : "Reply"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}