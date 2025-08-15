# Encrypted Direct Messages (DM) Feature

## Overview
MinSO now includes Instagram-style direct messaging with end-to-end encryption, ensuring your private conversations remain secure and private.

## Features

### 🔒 End-to-End Encryption
- **RSA + AES Hybrid Encryption**: Messages are encrypted using AES-256-GCM for speed, with AES keys encrypted using RSA-2048 for security
- **Client-Side Encryption**: All encryption happens in your browser before sending to the server
- **Zero-Knowledge Server**: The server cannot read your messages - only encrypted data is stored

### 💬 Instagram-Style Interface
- **Conversation List**: See all your conversations with unread message counts
- **Real-time Messaging**: Messages appear instantly with WebSocket updates
- **User Search**: Find and start conversations with any user
- **Message Status**: See when messages are delivered and read

### 🔑 Automatic Key Management
- **Transparent Setup**: Encryption keys are generated automatically on first use
- **Secure Storage**: Private keys are encrypted with your session and stored locally
- **Public Key Exchange**: Automatic retrieval of recipient public keys for message encryption

## How It Works

### Key Generation
1. When you first access messages, RSA-2048 key pairs are generated
2. Your private key is encrypted and stored securely
3. Your public key is shared for others to encrypt messages to you

### Message Encryption Flow
1. **Compose**: You type a message in plain text
2. **Encrypt**: Your browser encrypts the message with recipient's public key
3. **Send**: Only encrypted data is sent to the server
4. **Receive**: Encrypted messages are decrypted in your browser
5. **Display**: Messages appear as plain text only to you

### Security Features
- **Perfect Forward Secrecy**: Each message uses a unique AES key
- **Authenticated Encryption**: AES-GCM prevents tampering
- **Secure Key Exchange**: RSA-OAEP ensures safe key transmission
- **No Server Access**: Server cannot decrypt any messages

## Usage

### Starting a Conversation
1. Click the Messages icon in the navigation
2. Click the "+" button to start a new conversation
3. Search for a user by username
4. Start typing your message

### Managing Conversations
- **View All**: See all conversations sorted by recent activity
- **Unread Count**: Red badges show unread message counts
- **Real-time Updates**: New messages appear instantly
- **Message History**: Scroll to see older messages

### Security Indicators
- **🔒 End-to-end encrypted** indicator in chat header
- **[Encrypted message]** placeholder for messages you can't decrypt
- **Message status**: Delivered/read indicators

## Technical Implementation

### Frontend (Client-Side)
- **Web Crypto API**: Browser-native encryption using RSA-OAEP and AES-GCM
- **React Components**: Clean, responsive messaging interface
- **Real-time Updates**: WebSocket integration for instant messaging
- **TypeScript**: Full type safety for encryption operations

### Backend (Server-Side)
- **Encrypted Storage**: Only encrypted message content stored in database
- **Key Management**: Public key distribution and conversation management
- **API Endpoints**: RESTful API for message operations
- **WebSocket Events**: Real-time message broadcasting

### Database Schema
```sql
-- User encryption keys
user_keys (id, user_id, public_key, encrypted_private_key, key_version)

-- Conversations between users
conversations (id, participant1_id, participant2_id, last_message_at)

-- Encrypted messages
messages (id, conversation_id, sender_id, encrypted_content, encrypted_key, iv, read)
```

## Security Considerations

### What's Protected
✅ Message content is end-to-end encrypted  
✅ Only you can read your messages  
✅ Server cannot access message content  
✅ Perfect forward secrecy per message  
✅ Authentication prevents tampering  

### Limitations
⚠️ Metadata (who talks to whom, when) is visible to server  
⚠️ Private keys are stored in browser local storage  
⚠️ No perfect forward secrecy for key compromise  
⚠️ Relies on browser crypto implementation  

### Best Practices
- Don't share your account on public computers
- Log out from shared devices
- Report any suspicious activity
- Keep your browser updated

## Getting Started

1. **Access Messages**: Click the message icon in the top navigation
2. **Automatic Setup**: Encryption keys generate automatically
3. **Start Chatting**: Search for users and start secure conversations
4. **Enjoy Privacy**: Your messages are now end-to-end encrypted!

## API Endpoints

### Key Management
- `POST /api/dm/keys` - Generate/store user encryption keys
- `GET /api/dm/keys` - Get your encryption keys
- `GET /api/dm/keys/:userId` - Get user's public key

### Conversations
- `GET /api/dm/conversations` - List your conversations
- `GET /api/dm/conversations/:id/messages` - Get conversation messages
- `POST /api/dm/messages` - Send encrypted message
- `PUT /api/dm/conversations/:id/read` - Mark messages as read

### User Search
- `GET /api/dm/users/search?q=username` - Search users for new conversations

---

**Note**: This implementation provides strong encryption for privacy, but for maximum security in production environments, consider additional measures like key rotation, perfect forward secrecy, and hardware security modules.
