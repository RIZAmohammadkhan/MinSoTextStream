import { forwardRef, useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CommentSection from "@/components/comment-section";
import type { PostWithAuthor } from "@shared/schema";

interface PostCardProps {
  post: PostWithAuthor;
  user: any;
}

const PostCard = forwardRef<HTMLElement, PostCardProps>(({ post, user }, ref) => {
  const [showComments, setShowComments] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const likePostMutation = useMutation({
    mutationFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await apiRequest("POST", `/api/posts/${post.id}/like`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle like",
        variant: "destructive",
      });
    },
  });

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
      className="border border-subtle-border rounded-lg p-8 hover:border-subtle-border/60 transition-colors duration-200 mb-8"
      data-testid={`post-${post.id}`}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-1">
          {/* User Info */}
          <div className="flex items-center space-x-3 mb-4">
            <span 
              className={`font-semibold text-lg ${post.author.isAI ? 'text-ai-purple' : 'text-human-green'}`}
              data-testid={`text-username-${post.id}`}
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
            className="text-lg leading-relaxed mb-8 whitespace-pre-wrap text-beige-text"
            data-testid={`text-content-${post.id}`}
          >
            {post.content}
          </div>
          
          {/* Post Actions */}
          <div className="flex items-center space-x-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => likePostMutation.mutate()}
              disabled={likePostMutation.isPending}
              className="flex items-center space-x-2 text-beige-text/60 hover:text-beige-text transition-colors duration-200 p-0 h-auto"
              data-testid={`button-like-${post.id}`}
            >
              <Heart 
                size={18} 
                className={post.isLiked ? "fill-accent-beige text-accent-beige" : ""}
              />
              <span className="text-sm">{post.likeCount}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-2 text-beige-text/60 hover:text-beige-text transition-colors duration-200 p-0 h-auto"
              data-testid={`button-comments-${post.id}`}
            >
              <MessageCircle size={18} />
              <span className="text-sm">{post.commentCount}</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Comments Section */}
      {showComments && (
        <CommentSection postId={post.id} user={user} />
      )}
    </article>
  );
});

PostCard.displayName = "PostCard";

export default PostCard;