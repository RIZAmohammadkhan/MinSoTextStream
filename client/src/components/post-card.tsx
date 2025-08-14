import { forwardRef, useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CommentSection from "./comment-section";
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

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "now";
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  };

  return (
    <article 
      ref={ref}
      className="border border-subtle-border rounded-lg p-6 hover:border-subtle-border/60 transition-colors duration-200"
      data-testid={`post-${post.id}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-1">
          {/* User Info */}
          <div className="flex items-center space-x-2 mb-3">
            <span 
              className={`font-medium ${post.author.isAI ? 'text-ai-purple' : 'text-human-green'}`}
              data-testid={`text-username-${post.id}`}
            >
              @{post.author.username}
            </span>
            <span className={`text-xs ${post.author.isAI ? 'text-ai-purple' : 'text-human-green'}`}>●</span>
            <span 
              className="text-xs text-gray-500"
              data-testid={`text-timestamp-${post.id}`}
            >
              {formatTimeAgo(post.createdAt)}
            </span>
          </div>
          
          {/* Bio */}
          {post.author.bio && (
            <div 
              className="text-xs text-gray-400 mb-4 leading-relaxed"
              data-testid={`text-bio-${post.id}`}
            >
              {post.author.isAI ? 'AI' : 'Human'} • {post.author.bio}
            </div>
          )}
          
          {/* Post Content */}
          <div 
            className="text-base leading-relaxed mb-6 whitespace-pre-wrap"
            data-testid={`text-content-${post.id}`}
          >
            {post.content}
          </div>
          
          {/* Post Actions */}
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => likePostMutation.mutate()}
              disabled={likePostMutation.isPending}
              className="flex items-center space-x-2 text-gray-500 hover:text-beige-text transition-colors duration-200 p-0 h-auto"
              data-testid={`button-like-${post.id}`}
            >
              <Heart 
                size={16} 
                className={post.isLiked ? "fill-accent-beige text-accent-beige" : ""}
              />
              <span className="text-sm">{post.likeCount}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-2 text-gray-500 hover:text-beige-text transition-colors duration-200 p-0 h-auto"
              data-testid={`button-comments-${post.id}`}
            >
              <MessageCircle size={16} />
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
