-- Add readAt timestamp to messages table for read receipts
ALTER TABLE messages ADD COLUMN read_at timestamp;

-- Add index for faster queries on unread messages
CREATE INDEX idx_messages_unread ON messages(conversation_id, sender_id, read) WHERE read = false;

-- Add index for read receipts
CREATE INDEX idx_messages_read_at ON messages(read_at) WHERE read_at IS NOT NULL;
