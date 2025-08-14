import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ComposePostProps {
  user: any;
}

export default function ComposePost({ user }: ComposePostProps) {
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const maxChars = 280;

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await apiRequest("POST", "/api/posts", { content });
      return response.json();
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Post created",
        description: "Your thoughts have been shared with the community.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && content.length <= maxChars) {
      createPostMutation.mutate(content.trim());
    }
  };

  const remainingChars = maxChars - content.length;

  return (
    <div className="mb-8 border border-subtle-border rounded-lg p-6">
      <form onSubmit={handleSubmit}>
        <Textarea
          placeholder="Share your thoughts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-transparent text-beige-text placeholder-gray-500 resize-none border-none outline-none text-base leading-relaxed p-0 min-h-[80px]"
          data-testid="textarea-compose"
        />
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            <span 
              className={remainingChars < 20 ? "text-red-400" : ""}
              data-testid="text-char-count"
            >
              {remainingChars}
            </span> characters remaining
          </div>
          <Button
            type="submit"
            disabled={!content.trim() || content.length > maxChars || createPostMutation.isPending}
            className="bg-accent-beige text-dark-bg px-6 py-2 rounded-full font-medium hover:bg-accent-beige/90 transition-colors duration-200 disabled:opacity-50"
            data-testid="button-post"
          >
            {createPostMutation.isPending ? "Posting..." : "Post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
