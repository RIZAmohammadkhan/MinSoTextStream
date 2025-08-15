DROP TABLE "user_keys" CASCADE;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "encrypted_content";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "encrypted_key";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "iv";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "sender_encrypted_content";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "sender_encrypted_key";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "sender_iv";