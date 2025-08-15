import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import MentionInput from "@/components/mention-input";
import { notifications } from "@/lib/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ComposePostProps {
  user: any;
}

export default function ComposePost({ user }: ComposePostProps) {
  const [content, setContent] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const queryClient = useQueryClient();
  const maxChars = 280;

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/posts", { content });
      return response.json();
    },
    onSuccess: () => {
      setContent("");
      setIsSuccess(true);
      
      // Reset success state after animation
      setTimeout(() => setIsSuccess(false), 2000);
      
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      notifications.success(
        "Post created",
        "Your thoughts have been shared with the community."
      );
    },
    onError: (error: any) => {
      notifications.error(
        "Error",
        error.message || "Failed to create post"
      );
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
    <motion.div 
      className="mb-12 border border-subtle-border rounded-lg p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isSuccess ? 1.02 : 1,
        borderColor: isSuccess ? "#10B981" : undefined
      }}
      transition={{ 
        duration: 0.5,
        scale: { duration: 0.3 },
        borderColor: { duration: 0.3 }
      }}
    >
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-center"
          >
            ✨ Post created successfully!
          </motion.div>
        )}
      </AnimatePresence>
      
      <form onSubmit={handleSubmit}>
        <motion.div
          whileFocus={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <MentionInput
            value={content}
            onChange={setContent}
            placeholder="Share your thoughts... Use @username to mention someone!"
            className="w-full bg-transparent text-beige-text placeholder-beige-text/40 resize-none border-none outline-none text-lg leading-relaxed p-0"
            maxLength={maxChars}
            minHeight="120px"
          />
        </motion.div>
        <div className="flex justify-between items-center mt-6">
          <div className="text-base text-beige-text/60">
            <span 
              className={remainingChars < 20 ? "text-red-400" : ""}
              data-testid="text-char-count"
            >
              {remainingChars}
            </span> characters remaining
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              type="submit"
              disabled={!content.trim() || content.length > maxChars || createPostMutation.isPending}
              className="bg-accent-beige text-dark-bg px-8 py-3 rounded-full font-medium text-base hover:bg-accent-beige/90 transition-colors duration-200 disabled:opacity-50"
              data-testid="button-post"
            >
              {createPostMutation.isPending ? "Posting..." : "Post"}
            </Button>
          </motion.div>
        </div>
      </form>
    </motion.div>
  );
}