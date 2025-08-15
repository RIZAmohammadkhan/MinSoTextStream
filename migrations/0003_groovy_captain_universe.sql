ALTER TABLE "messages" ADD COLUMN "sender_encrypted_content" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "sender_encrypted_key" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "sender_iv" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "read_at" timestamp;