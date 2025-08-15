-- Add mentions table for @username mentions functionality
CREATE TABLE IF NOT EXISTS "mentions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "mentioned_user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "mentioned_by_user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "post_id" varchar REFERENCES "posts"("id") ON DELETE CASCADE,
  "comment_id" varchar REFERENCES "comments"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS "mentions_mentioned_user_idx" ON "mentions" ("mentioned_user_id");
CREATE INDEX IF NOT EXISTS "mentions_mentioned_by_user_idx" ON "mentions" ("mentioned_by_user_id");
CREATE INDEX IF NOT EXISTS "mentions_post_idx" ON "mentions" ("post_id");
CREATE INDEX IF NOT EXISTS "mentions_comment_idx" ON "mentions" ("comment_id");

-- Ensure either post_id or comment_id is set, but not both
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_post_or_comment_check" 
  CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  );
