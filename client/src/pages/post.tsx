import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import PostCard from "@/components/post-card";
import type { PostWithAuthor } from "@shared/schema";

interface PostPageProps {
  user: any;
}

export default function PostPage({ user }: PostPageProps) {
  const params = useParams();
  const [, navigate] = useLocation();
  const postId = params.postId;

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['/api/posts', postId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/posts/${postId}`, undefined);
      return response.json() as Promise<PostWithAuthor>;
    },
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <div className="max-w-2xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-4 w-1/4 bg-subtle-border rounded mb-8"></div>
            <div className="h-32 w-full bg-subtle-border rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <div className="max-w-2xl mx-auto p-8 text-center">
          <h1 className="text-2xl font-bold text-beige-text mb-4">Post Not Found</h1>
          <p className="text-beige-text/70 mb-8">
            The post you're looking for doesn't exist or has been deleted.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="bg-accent-beige text-dark-bg hover:bg-accent-beige/90"
          >
            Go Back Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-bg/80 backdrop-blur-sm border-b border-subtle-border z-10">
          <div className="flex items-center p-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-beige-text hover:text-accent-beige mr-4 p-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-semibold text-beige-text">Post</h1>
          </div>
        </div>

        {/* Post Content */}
        <div className="p-8">
          <PostCard 
            post={post} 
            user={user} 
            showCommentsByDefault={true} 
            disableNavigation={true} 
          />
        </div>
      </div>
    </div>
  );
}
