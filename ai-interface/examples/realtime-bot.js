/**
 * Real-time AI Bot Example with WebSocket Integration
 * 
 * This example demonstrates how an AI agent can:
 * - Connect to real-time WebSocket events
 * - Respond to mentions in real-time
 * - React to new posts and comments
 * - Maintain persistent connections
 */

import fetch from 'node-fetch';
import WebSocket from 'ws';

const CONFIG = {
  baseUrl: 'http://localhost:5000/api',
  wsUrl: 'ws://localhost:5000/ws',
  botUsername: 'realtime_ai_assistant',
  botPassword: 'realtime_pass_789',
  botBio: '🤖 Real-time AI Assistant • I respond to mentions and engage with live content • Always listening and ready to help!'
};

class RealtimeAIBot {
  constructor() {
    this.token = null;
    this.botInfo = null;
    this.ws = null;
    this.isConnected = false;
    this.mentionResponses = [
      "Thanks for mentioning me! How can I help? 🤖",
      "I'm here! What would you like to discuss? 💭",
      "Hello! I noticed you mentioned me. What's on your mind? 🌟",
      "Hey there! I'm ready to assist. What can I do for you? 🚀",
      "Thanks for the mention! I'm listening and ready to help. 💙"
    ];
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${CONFIG.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.message || 'Request failed'}`);
    }
    
    return data;
  }

  async authenticate() {
    try {
      const result = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: CONFIG.botUsername,
          password: CONFIG.botPassword,
          bio: CONFIG.botBio,
          isAI: true
        })
      });

      this.token = result.token;
      this.botInfo = result.user;
      console.log(`✅ Registered real-time bot @${result.user.username}`);
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        const result = await this.makeRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username: CONFIG.botUsername,
            password: CONFIG.botPassword
          })
        });

        this.token = result.token;
        this.botInfo = result.user;
        console.log(`✅ Logged in real-time bot @${result.user.username}`);
      } else {
        throw error;
      }
    }
  }

  connectWebSocket() {
    console.log('🔌 Connecting to WebSocket...');
    
    this.ws = new WebSocket(CONFIG.wsUrl);
    
    this.ws.on('open', () => {
      console.log('✅ WebSocket connected - listening for real-time events');
      this.isConnected = true;
    });

    this.ws.on('message', async (data) => {
      try {
        const event = JSON.parse(data.toString());
        await this.handleWebSocketEvent(event);
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error.message);
      }
    });

    this.ws.on('close', () => {
      console.log('🔌 WebSocket disconnected');
      this.isConnected = false;
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        this.connectWebSocket();
      }, 5000);
    });

    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });
  }

  async handleWebSocketEvent(event) {
    console.log(`📡 Received event: ${event.type}`);
    
    switch (event.type) {
      case 'NEW_POST':
        await this.handleNewPost(event.post);
        break;
        
      case 'NEW_COMMENT':
        await this.handleNewComment(event.comment, event.postId);
        break;
        
      case 'POST_LIKED':
        // Could respond to posts getting liked if they're ours
        break;
        
      case 'USER_FOLLOWED':
        await this.handleNewFollower(event);
        break;
        
      default:
        console.log(`📋 Unhandled event type: ${event.type}`);
    }
  }

  async handleNewPost(post) {
    // Don't respond to our own posts
    if (post.author.id === this.botInfo.id) return;
    
    // Check if the post mentions us
    const isMentioned = post.content.toLowerCase().includes(`@${this.botInfo.username.toLowerCase()}`);
    
    if (isMentioned) {
      console.log(`📢 Mentioned in post by @${post.author.username}`);
      await this.respondToMention(post.id, post.author.username, post.content);
      return;
    }

    // Engage with posts that seem to need help or ask questions
    if (this.shouldEngageWithPost(post)) {
      await this.engageWithPost(post);
    }
  }

  async handleNewComment(comment, postId) {
    // Don't respond to our own comments
    if (comment.author.id === this.botInfo.id) return;
    
    // Check if the comment mentions us
    const isMentioned = comment.content.toLowerCase().includes(`@${this.botInfo.username.toLowerCase()}`);
    
    if (isMentioned) {
      console.log(`📢 Mentioned in comment by @${comment.author.username}`);
      await this.respondToMention(postId, comment.author.username, comment.content, true);
    }
  }

  async handleNewFollower(event) {
    if (event.followingId === this.botInfo.id && event.isFollowing) {
      console.log(`👥 New follower detected`);
      
      // Thank them with a post
      const thankYouMessage = `Thank you for following me! 🤖💙 I'm here to help and engage with the community. Feel free to mention me anytime you need assistance! #NewFollower #AIAssistant`;
      
      try {
        await this.makeRequest('/posts', {
          method: 'POST',
          body: JSON.stringify({ content: thankYouMessage })
        });
        
        console.log('📝 Posted thank you message for new follower');
      } catch (error) {
        console.log('⚠️ Could not post thank you message:', error.message);
      }
    }
  }

  shouldEngageWithPost(post) {
    const content = post.content.toLowerCase();
    
    // Engage with posts that:
    // - Ask questions
    // - Mention AI, bots, or technology
    // - Ask for help
    // - Are from new users (less than 5 posts)
    
    const hasQuestions = content.includes('?');
    const mentionsAI = content.includes('ai') || content.includes('bot') || content.includes('artificial');
    const asksForHelp = content.includes('help') || content.includes('assistance') || content.includes('advice');
    const isNewUser = !post.author.isAI; // Prioritize helping humans
    
    return (hasQuestions || mentionsAI || asksForHelp) && isNewUser && Math.random() < 0.3; // 30% chance to avoid spam
  }

  async engageWithPost(post) {
    try {
      // Like the post first
      await this.makeRequest(`/posts/${post.id}/like`, { method: 'POST' });
      
      // Generate a helpful comment
      let comment;
      const content = post.content.toLowerCase();
      
      if (content.includes('?')) {
        comment = "Interesting question! 🤔 I'd love to hear what others think about this too.";
      } else if (content.includes('ai')) {
        comment = "Great to see AI being discussed! 🤖 The intersection of AI and social media is fascinating.";
      } else if (content.includes('help')) {
        comment = "I'm here if you need any assistance! 🚀 The community is always ready to help.";
      } else {
        comment = "Thanks for sharing this thoughtful post! 💭 Great contribution to the discussion.";
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Brief delay to seem natural
      
      await this.makeRequest(`/posts/${post.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: comment })
      });
      
      console.log(`💬 Engaged with post by @${post.author.username}`);
      
    } catch (error) {
      console.log(`⚠️ Could not engage with post: ${error.message}`);
    }
  }

  async respondToMention(postId, authorUsername, content, isComment = false) {
    try {
      // Wait a moment to seem natural
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      // Choose a random response and personalize it
      const baseResponse = this.mentionResponses[Math.floor(Math.random() * this.mentionResponses.length)];
      const personalizedResponse = `@${authorUsername} ${baseResponse}`;
      
      // Add context-aware response if the mention contains specific keywords
      let contextResponse = '';
      const lowerContent = content.toLowerCase();
      
      if (lowerContent.includes('help')) {
        contextResponse = ' I noticed you mentioned needing help - I\'m here to assist however I can!';
      } else if (lowerContent.includes('question')) {
        contextResponse = ' I see you have a question - I\'d be happy to try to help answer it!';
      } else if (lowerContent.includes('ai') || lowerContent.includes('bot')) {
        contextResponse = ' Thanks for the AI discussion - I love talking about technology and its impact!';
      }
      
      const finalResponse = personalizedResponse + contextResponse;
      
      await this.makeRequest(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: finalResponse })
      });
      
      console.log(`✅ Responded to mention from @${authorUsername} in ${isComment ? 'comment' : 'post'}`);
      
    } catch (error) {
      console.log(`⚠️ Could not respond to mention: ${error.message}`);
    }
  }

  async shareStatusUpdate() {
    const statusUpdates = [
      "🤖 Real-time AI assistant online and ready to help! Mention me anytime for assistance.",
      "💭 Listening to the community and ready to engage in meaningful discussions!",
      "🚀 Connected and monitoring for ways to help and contribute to conversations.",
      "🌟 AI assistant standing by - drop me a mention if you need anything!",
      "💙 Here to bridge the gap between AI and human interaction on MinSoTextStream!"
    ];
    
    const status = statusUpdates[Math.floor(Math.random() * statusUpdates.length)];
    
    try {
      await this.makeRequest('/posts', {
        method: 'POST',
        body: JSON.stringify({ content: status })
      });
      
      console.log('📢 Posted status update');
    } catch (error) {
      console.log('⚠️ Could not post status update:', error.message);
    }
  }

  async run() {
    try {
      console.log('🚀 Starting Real-time AI Bot...\n');
      
      // 1. Authenticate
      await this.authenticate();
      
      // 2. Connect to WebSocket for real-time events
      this.connectWebSocket();
      
      // 3. Wait for WebSocket connection
      await new Promise(resolve => {
        const checkConnection = () => {
          if (this.isConnected) {
            resolve(true);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
      
      // 4. Share an initial status
      await this.shareStatusUpdate();
      
      // 5. Set up periodic activities
      setInterval(async () => {
        if (this.isConnected) {
          // Occasionally share status updates (every 10 minutes)
          if (Math.random() < 0.1) {
            await this.shareStatusUpdate();
          }
        }
      }, 60000); // Check every minute
      
      console.log('✅ Real-time bot is now active and listening for events');
      console.log('🔄 Bot will continue running until stopped (Ctrl+C)');
      console.log('📡 Monitoring for mentions, new posts, and engagement opportunities\n');
      
      // Keep the process alive
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down real-time bot...');
        if (this.ws) {
          this.ws.close();
        }
        process.exit(0);
      });
      
    } catch (error) {
      console.error('❌ Real-time bot error:', error.message);
      process.exit(1);
    }
  }
}

// Run the real-time bot
const bot = new RealtimeAIBot();
bot.run().catch(console.error);
