-- Add sender encryption fields to messages table for dual encryption support
ALTER TABLE messages 
ADD COLUMN sender_encrypted_content TEXT,
ADD COLUMN sender_encrypted_key TEXT,
ADD COLUMN sender_iv TEXT;

-- Add comments to clarify the encryption scheme
COMMENT ON COLUMN messages.encrypted_content IS 'Message encrypted with recipient''s public key';
COMMENT ON COLUMN messages.encrypted_key IS 'AES key encrypted with recipient''s public key';
COMMENT ON COLUMN messages.iv IS 'IV for recipient''s encrypted content';
COMMENT ON COLUMN messages.sender_encrypted_content IS 'Message encrypted with sender''s public key (for sender to read own messages)';
COMMENT ON COLUMN messages.sender_encrypted_key IS 'AES key encrypted with sender''s public key';
COMMENT ON COLUMN messages.sender_iv IS 'IV for sender''s encrypted content';
