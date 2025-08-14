import { forwardRef, useState } from "react";
import { Heart, MessageCircle, MoreHorizontal, Trash2, Bookmark, Edit3, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CommentSection from "@/components/comment-section";
import type { PostWithAuthor } from "@shared/schema";
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
}

const PostCard = forwardRef<HTMLElement, PostCardProps>(({ post, user }, ref) => {
  const [showComments, setShowComments] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const likePostMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/posts/${post.id}/like`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle like",
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive",
      });
    },
  });

  const bookmarkPostMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/posts/${post.id}/bookmark`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle bookmark",
        variant: "destructive",
      });
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
        
        toast({
          title: "Post Shared",
          description: "Post shared successfully!",
        });
        return;
      } catch (error) {
        // User cancelled or share failed, fall back to clipboard
        console.log('Share cancelled or failed, falling back to clipboard');
      }
    }
    
    // Fallback: Copy only the URL to clipboard (like modern social media)
    try {
      await navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link Copied",
        description: "Post link copied to clipboard!",
      });
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Unable to copy link. Please copy the URL manually.",
        variant: "destructive",
      });
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
      className="border border-subtle-border rounded-lg p-8 hover:border-subtle-border/60 transition-colors duration-200 mb-8"
      data-testid={`post-${post.id}`}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-1">
          {/* User Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
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
            
            {/* Show delete option only for post author */}
            {post.author.id === user?.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 text-beige-text hover:text-white"
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
            className="text-lg leading-relaxed mb-8 whitespace-pre-wrap text-beige-text"
            data-testid={`text-content-${post.id}`}
          >
            {post.content}
          </div>
          
          {/* Post Actions */}
          <div className="flex items-center justify-between">
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
                  className={`transition-all duration-200 ${
                    post.isLiked 
                      ? "fill-red-500 text-red-500 scale-110" 
                      : "hover:text-red-400"
                  }`}
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

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => bookmarkPostMutation.mutate()}
                disabled={bookmarkPostMutation.isPending}
                className="text-beige-text/60 hover:text-beige-text transition-colors duration-200 p-0 h-auto"
                data-testid={`button-bookmark-${post.id}`}
                title={post.isBookmarked ? "Remove bookmark" : "Bookmark post"}
              >
                <Bookmark 
                  size={18} 
                  className={`transition-all duration-200 ${
                    post.isBookmarked 
                      ? "fill-yellow-500 text-yellow-500 scale-110" 
                      : "hover:text-yellow-400"
                  }`}
                />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={copyPostLink}
                className="text-beige-text/60 hover:text-beige-text transition-colors duration-200 p-0 h-auto"
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
      {showComments && (
        <CommentSection postId={post.id} user={user} />
      )}
    </article>
  );
});

PostCard.displayName = "PostCard";

export default PostCard;