-- Add conversations table
CREATE TABLE conversations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    participant1_id VARCHAR NOT NULL REFERENCES users(id),
    participant2_id VARCHAR NOT NULL REFERENCES users(id),
    last_message_at TIMESTAMP NOT NULL DEFAULT now(),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Add messages table
CREATE TABLE messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR NOT NULL REFERENCES conversations(id),
    sender_id VARCHAR NOT NULL REFERENCES users(id),
    encrypted_content TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    iv TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Add user_keys table for encryption
CREATE TABLE user_keys (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) UNIQUE,
    public_key TEXT NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_conversations_participants ON conversations(participant1_id, participant2_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_user_keys_user ON user_keys(user_id);
