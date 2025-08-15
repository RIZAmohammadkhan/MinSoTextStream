import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertPostSchema, insertCommentSchema, insertMessageSchema } from "@shared/schema";
import { extractMentions, createMentionNotificationMessage } from "@shared/mention-utils";
import { generateKeyPair, encryptPrivateKey } from "@shared/encryption-utils";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// JWT secret - in production, use a proper environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = '24h';

// Simple session store for demo purposes - in production, use Redis or database
const sessions = new Map<string, { userId: string; username: string; expiresAt: Date }>();

// Clean up expired sessions periodically
setInterval(() => {
  const now = new Date();
  Array.from(sessions.entries()).forEach(([sessionId, session]) => {
    if (session.expiresAt < now) {
      sessions.delete(sessionId);
    }
  });
}, 60000); // Clean up every minute

// Helper function to hash passwords using bcrypt
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Higher than default for better security
  return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Helper function to generate JWT token
function generateJWT(userId: string, username: string): string {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Helper function to verify JWT token
function verifyJWT(token: string): { userId: string; username: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { userId: decoded.userId, username: decoded.username };
  } catch (error) {
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  function broadcast(message: any) {
    const data = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Middleware to check authentication
  function requireAuth(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Try JWT first
    const jwtPayload = verifyJWT(token);
    if (jwtPayload) {
      req.user = jwtPayload;
      return next();
    }
    
    // Fallback to session-based auth for backward compatibility
    const session = sessions.get(token);
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    req.user = session;
    next();
  }

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ 
          message: "Username already exists", 
          field: "username",
          details: "This username is already taken. Please choose a different one."
        });
      }
      
      // Hash password before storing
      const hashedPassword = await hashPassword(userData.password);
      const hashedUserData = {
        ...userData,
        password: hashedPassword
      };
      
      const user = await storage.createUser(hashedUserData);
      
      // Generate encryption keys automatically for the new user
      try {
        const keyPair = generateKeyPair();
        
        // For demo purposes, we'll use a simple encryption of private key with user's password
        // In production, this should be properly encrypted with additional security measures
        const encryptedPrivateKey = encryptPrivateKey(keyPair.privateKey, userData.password);
        
        // Store the user's encryption keys
        await storage.createUserKeys(user.id, keyPair.publicKey, encryptedPrivateKey);
        
        console.log(`Generated encryption keys for user: ${user.username}`);
      } catch (keyError) {
        console.error('Failed to generate encryption keys for user:', keyError);
        // Don't fail registration if key generation fails, but log it
        // User can regenerate keys later if needed
      }
      
      // Generate JWT token
      const jwtToken = generateJWT(user.id, user.username);
      
      // Also create session for backward compatibility
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      sessions.set(sessionId, { userId: user.id, username: user.username, expiresAt });
      
      res.json({ 
        user: { id: user.id, username: user.username, bio: user.bio, isAI: user.isAI, createdAt: user.createdAt },
        sessionId: jwtToken, // Use JWT as sessionId for compatibility
        token: jwtToken
      });
    } catch (error: any) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        console.log(`Registration validation failed: ${error.errors.map((e: any) => `${e.path[0]}: ${e.message}`).join(', ')}`);
        
        const errors = error.errors.map((err: any) => ({
          field: err.path[0],
          message: err.message,
          code: err.code
        }));
        
        // Create user-friendly error messages
        const userFriendlyErrors = errors.map((err: any) => {
          switch (err.field) {
            case 'username':
              if (err.code === 'too_small') {
                return { field: err.field, message: 'Username must be at least 3 characters long' };
              } else if (err.code === 'too_big') {
                return { field: err.field, message: 'Username must be no more than 20 characters long' };
              } else if (err.code === 'invalid_string') {
                return { field: err.field, message: 'Username can only contain letters, numbers, and underscores' };
              }
              break;
            case 'password':
              if (err.code === 'too_small') {
                return { field: err.field, message: 'Password must be at least 6 characters long' };
              }
              break;
            case 'bio':
              if (err.code === 'too_big') {
                return { field: err.field, message: 'Bio must be less than 500 characters' };
              }
              break;
          }
          return { field: err.field, message: err.message };
        });
        
        return res.status(400).json({ 
          message: "Validation failed",
          errors: userFriendlyErrors,
          details: userFriendlyErrors.length === 1 
            ? userFriendlyErrors[0].message 
            : `Please fix the following errors: ${userFriendlyErrors.map((e: any) => e.message).join(', ')}`
        });
      }
      
      console.error('Registration error:', error.message);
      res.status(500).json({ 
        message: "Registration failed", 
        details: "An internal error occurred. Please try again later."
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log('Login attempt:', { username: req.body.username, hasPassword: !!req.body.password });
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ 
          message: "Missing credentials", 
          details: "Both username and password are required."
        });
      }
      
      const user = await storage.getUserByUsername(username);
      
      console.log('User found:', !!user);
      if (!user) {
        console.log('User not found for username:', username);
        return res.status(401).json({ 
          message: "Invalid credentials", 
          field: "username",
          details: "No account found with this username. Please check your username or create a new account."
        });
      }
      
      const passwordValid = await verifyPassword(password, user.password);
      console.log('Password valid:', passwordValid);
      
      if (!passwordValid) {
        return res.status(401).json({ 
          message: "Invalid credentials", 
          field: "password",
          details: "Incorrect password. Please check your password and try again."
        });
      }
      
      // Generate JWT token
      const jwtToken = generateJWT(user.id, user.username);
      
      // Also create session for backward compatibility
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      sessions.set(sessionId, { userId: user.id, username: user.username, expiresAt });
      
      console.log('Login successful for:', username);
      res.json({ 
        user: { id: user.id, username: user.username, bio: user.bio, isAI: user.isAI, createdAt: user.createdAt },
        sessionId: jwtToken, // Use JWT as sessionId for compatibility
        token: jwtToken
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        message: "Login failed", 
        details: "An internal error occurred. Please try again later."
      });
    }
  });

  app.post("/api/auth/logout", requireAuth, (req: any, res) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ success: true });
  });

  // Change password
  app.post("/api/auth/change-password", requireAuth, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          message: "Missing required fields",
          details: "Both current and new password are required."
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ 
          message: "Password too short",
          details: "Password must be at least 6 characters long."
        });
      }
      
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          message: "Invalid current password",
          details: "The current password you entered is incorrect."
        });
      }
      
      // Update password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedPassword });
      
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ 
        message: "Failed to change password", 
        details: "An internal error occurred. Please try again later."
      });
    }
  });

  // Delete account
  app.delete("/api/auth/delete-account", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      
      // Delete the user account and all associated data
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Clear the session
      const sessionId = req.headers.authorization?.replace('Bearer ', '');
      if (sessionId) {
        sessions.delete(sessionId);
      }
      
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ 
        message: "Failed to delete account", 
        details: "An internal error occurred. Please try again later."
      });
    }
  });

  // Posts routes
  app.get("/api/posts", async (req, res) => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;
      const feed = req.query.feed as string; // 'following' or 'discover'
      
      // Get user authentication (same logic as trending posts)
      const authHeader = req.headers.authorization;
      let userId: string | null = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        
        // Try JWT first
        const jwtPayload = verifyJWT(token);
        if (jwtPayload) {
          userId = jwtPayload.userId;
        } else {
          // Fallback to session-based auth
          const session = sessions.get(token);
          if (session && session.expiresAt > new Date()) {
            userId = session.userId;
          }
        }
      }
      
      let posts;
      if (feed === 'following' && userId) {
        posts = await storage.getFollowingPosts(userId, offset, limit);
      } else {
        posts = await storage.getPosts(offset, limit);
      }
      
      // Get user likes and bookmarks if authenticated
      if (userId) {
        const userLikes = await storage.getUserLikes(userId);
        const userBookmarks = await storage.getUserBookmarks(userId, 0, 1000);
        const bookmarkedPostIds = userBookmarks.map(post => post.id);
        
        posts.forEach(post => {
          post.isLiked = userLikes.some(like => like.postId === post.id);
          post.isBookmarked = bookmarkedPostIds.includes(post.id);
        });
      }
      
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  // Trending posts (must be before :postId route)
  app.get('/api/posts/trending', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const posts = await storage.getTrendingPosts(limit);
      
      // Get user likes if authenticated
      const authHeader = req.headers.authorization;
      let userId: string | null = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        
        // Try JWT first
        const jwtPayload = verifyJWT(token);
        if (jwtPayload) {
          userId = jwtPayload.userId;
        } else {
          // Fallback to session-based auth
          const session = sessions.get(token);
          if (session && session.expiresAt > new Date()) {
            userId = session.userId;
          }
        }
      }
      
      if (userId) {
        const userLikes = await storage.getUserLikes(userId);
        const userBookmarks = await storage.getUserBookmarks(userId, 0, 1000);
        const bookmarkedPostIds = userBookmarks.map(post => post.id);
        
        posts.forEach(post => {
          post.isLiked = userLikes.some(like => like.postId === post.id);
          post.isBookmarked = bookmarkedPostIds.includes(post.id);
        });
      }
      
      res.json(posts);
    } catch (error) {
      console.error('Get trending posts error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get individual post by ID (for sharing)
  app.get("/api/posts/:postId", async (req, res) => {
    try {
      const { postId } = req.params;
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Get user authentication (same logic as trending posts)
      const authHeader = req.headers.authorization;
      let userId: string | null = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        
        // Try JWT first
        const jwtPayload = verifyJWT(token);
        if (jwtPayload) {
          userId = jwtPayload.userId;
        } else {
          // Fallback to session-based auth
          const session = sessions.get(token);
          if (session && session.expiresAt > new Date()) {
            userId = session.userId;
          }
        }
      }
      
      if (userId) {
        const userLikes = await storage.getUserLikes(userId);
        const userBookmarks = await storage.getUserBookmarks(userId, 0, 1000);
        const bookmarkedPostIds = userBookmarks.map(p => p.id);
        
        post.isLiked = userLikes.some(like => like.postId === post.id);
        post.isBookmarked = bookmarkedPostIds.includes(post.id);
      }
      
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  app.post("/api/posts", requireAuth, async (req: any, res) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(postData, req.user.userId);
      
      // Process mentions in the post content
      const mentions = extractMentions(postData.content);
      if (mentions.length > 0) {
        // Get users that exist with these usernames
        const mentionedUsers = await storage.getUsersByUsernames(mentions);
        
        // Create mentions and notifications for existing users
        for (const user of mentionedUsers) {
          if (user.id !== req.user.userId) { // Don't mention yourself
            // Create mention record
            await storage.createMention(user.id, req.user.userId, post.id);
            
            // Create notification
            const message = createMentionNotificationMessage(req.user.username, true);
            await storage.createNotification(
              user.id,
              'mention',
              message,
              post.id,
              req.user.userId
            );
          }
        }
      }
      
      // Get full post with author for broadcast
      const fullPost = await storage.getPost(post.id);
      
      // Broadcast new post to all connected clients
      broadcast({ type: 'NEW_POST', post: fullPost });
      
      res.json(post);
    } catch (error) {
      console.error('Create post error:', error);
      res.status(400).json({ 
        message: "Invalid input",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.delete("/api/posts/:postId", requireAuth, async (req: any, res) => {
    try {
      const { postId } = req.params;
      const success = await storage.deletePost(postId, req.user.userId);
      
      if (!success) {
        return res.status(403).json({ message: "You can only delete your own posts" });
      }
      
      // Broadcast post deletion
      broadcast({ type: 'POST_DELETED', postId });
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete post" });
    }
  });

  app.post("/api/posts/:postId/like", requireAuth, async (req: any, res) => {
    try {
      const { postId } = req.params;
      
      // Check if user is trying to like their own post
      const post = await storage.getPost(postId);
      if (post && post.author.id === req.user.userId) {
        return res.status(400).json({ message: "You cannot like your own post" });
      }
      
      const isLiked = await storage.togglePostLike(req.user.userId, postId);
      
      // Create notification for post author if liked
      if (isLiked) {
        if (post && post.author.id !== req.user.userId) {
          await storage.createNotification(
            post.author.id,
            'like',
            `${req.user.username} liked your post`,
            postId,
            req.user.userId
          );
        }
      }
      
      // Broadcast like update
      const updatedPost = await storage.getPost(postId);
      broadcast({ type: 'POST_LIKED', postId, likeCount: updatedPost?.likeCount || 0 });
      
      res.json({ isLiked });
    } catch (error) {
      res.status(400).json({ message: "Failed to toggle like" });
    }
  });

  // Comments routes
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const { postId } = req.params;
      const comments = await storage.getCommentsByPostId(postId);
      
      // Get user authentication (same logic as trending posts)
      const authHeader = req.headers.authorization;
      let userId: string | null = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        
        // Try JWT first
        const jwtPayload = verifyJWT(token);
        if (jwtPayload) {
          userId = jwtPayload.userId;
        } else {
          // Fallback to session-based auth
          const session = sessions.get(token);
          if (session && session.expiresAt > new Date()) {
            userId = session.userId;
          }
        }
      }
      
      if (userId) {
        const userLikes = await storage.getUserLikes(userId);
        comments.forEach(comment => {
          comment.isLiked = userLikes.some(like => like.commentId === comment.id);
        });
      }
      
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/posts/:postId/comments", requireAuth, async (req: any, res) => {
    try {
      const { postId } = req.params;
      const commentData = insertCommentSchema.parse({ ...req.body, postId });
      const comment = await storage.createComment(commentData, req.user.userId);
      
      // Get the post to notify the author
      const post = await storage.getPost(postId);
      
      // Create notification for post author if not commenting on own post
      if (post && post.author.id !== req.user.userId) {
        await storage.createNotification(
          post.author.id,
          'comment',
          `${req.user.username} replied to your post`,
          postId,
          req.user.userId
        );
      }
      
      // Get all existing comments on this post to notify other commenters
      const existingComments = await storage.getCommentsByPostId(postId);
      const uniqueCommenters = new Set<string>();
      
      // Collect unique commenter IDs (excluding post author and current user)
      existingComments.forEach(existingComment => {
        if (existingComment.author.id !== req.user.userId && 
            existingComment.author.id !== post?.author.id) {
          uniqueCommenters.add(existingComment.author.id);
        }
      });
      
      // Notify all unique commenters about the new reply
      for (const commenterId of Array.from(uniqueCommenters)) {
        await storage.createNotification(
          commenterId,
          'comment',
          `${req.user.username} also replied to ${post?.author.username}'s post`,
          postId,
          req.user.userId
        );
      }
      
      // Process mentions in the comment content
      const mentions = extractMentions(commentData.content);
      if (mentions.length > 0) {
        // Get users that exist with these usernames
        const mentionedUsers = await storage.getUsersByUsernames(mentions);
        
        // Create mentions and notifications for existing users
        for (const user of mentionedUsers) {
          if (user.id !== req.user.userId) { // Don't mention yourself
            // Create mention record
            await storage.createMention(user.id, req.user.userId, undefined, comment.id);
            
            // Create notification
            const message = createMentionNotificationMessage(req.user.username, false);
            await storage.createNotification(
              user.id,
              'mention',
              message,
              postId, // Include postId for context
              req.user.userId
            );
          }
        }
      }
      
      // Get comment with author
      const comments = await storage.getCommentsByPostId(postId);
      const newComment = comments.find(c => c.id === comment.id);
      
      // Broadcast new comment
      broadcast({ type: 'NEW_COMMENT', comment: newComment, postId });
      
      res.json(comment);
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(400).json({ 
        message: "Invalid input",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/comments/:commentId/like", requireAuth, async (req: any, res) => {
    try {
      const { commentId } = req.params;
      
      // Get the comment to check ownership
      const comment = await storage.getComment(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Check if user is trying to like their own comment
      if (comment.author.id === req.user.userId) {
        return res.status(400).json({ message: "You cannot like your own comment" });
      }
      
      const isLiked = await storage.toggleCommentLike(req.user.userId, commentId);
      
      // Create notification for comment author if liked
      if (isLiked) {
        await storage.createNotification(
          comment.author.id,
          'like',
          `${req.user.username} liked your comment`,
          comment.postId,
          req.user.userId
        );
      }
      
      // Get updated comment for broadcast
      const updatedComment = await storage.getComment(commentId);
      broadcast({ type: 'COMMENT_LIKED', commentId, likeCount: updatedComment?.likeCount || 0 });
      
      res.json({ isLiked });
    } catch (error) {
      console.error('Comment like error:', error);
      res.status(400).json({ message: "Failed to toggle like" });
    }
  });

  // Search users
  app.get('/api/users/search', requireAuth, async (req: any, res) => {
    try {
      const { q: query } = req.query;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Query parameter is required' });
      }

      const users = await storage.searchUsers(query, req.user.userId, 20);
      res.json(users);
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Search users for mentions (simpler endpoint)
  app.get('/api/users/mentions', requireAuth, async (req: any, res) => {
    try {
      const { q: query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Query parameter is required' });
      }

      const users = await storage.searchUsers(query, req.user.userId, 10);
      
      // Return simplified user data for mentions
      const mentionUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        isAI: user.isAI
      }));
      
      res.json(mentionUsers);
    } catch (error) {
      console.error('Search mentions error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Toggle follow
  app.post('/api/users/:userId/follow', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const isFollowing = await storage.toggleFollow(req.user.userId, userId);
      
      // Create notification for followed user
      if (isFollowing) {
        await storage.createNotification(
          userId,
          'follow',
          `${req.user.username} started following you`,
          undefined,
          req.user.userId
        );
      }
      
      broadcast({ type: 'USER_FOLLOWED', followerId: req.user.userId, followingId: userId, isFollowing });
      
      res.json({ isFollowing });
    } catch (error) {
      console.error('Toggle follow error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get followers
  app.get('/api/users/:userId/followers', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const followers = await storage.getFollowers(userId);
      res.json(followers);
    } catch (error) {
      console.error('Get followers error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get following
  app.get('/api/users/:userId/following', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const following = await storage.getFollowing(userId);
      res.json(following);
    } catch (error) {
      console.error('Get following error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user profile
  app.get('/api/users/:userId', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const stats = await storage.getUserStats(userId);
      const followers = await storage.getFollowers(userId);
      const following = await storage.getFollowing(userId);
      const isFollowing = followers.some(follower => follower.id === req.user.userId);

      res.json({
        ...user,
        password: undefined, // Never send password
        stats,
        followerCount: followers.length,
        followingCount: following.length,
        isFollowing
      });
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update user profile
  app.put('/api/users/:userId', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      if (userId !== req.user.userId) {
        return res.status(403).json({ message: 'You can only update your own profile' });
      }

      const updates = req.body;
      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        ...updatedUser,
        password: undefined // Never send password
      });
    } catch (error) {
      console.error('Update user profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user posts
  app.get('/api/users/:userId/posts', async (req, res) => {
    try {
      const { userId } = req.params;
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const posts = await storage.getUserPosts(userId, offset, limit);
      
      // Get user authentication (same logic as trending posts)
      const authHeader = req.headers.authorization;
      let currentUserId: string | null = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        
        // Try JWT first
        const jwtPayload = verifyJWT(token);
        if (jwtPayload) {
          currentUserId = jwtPayload.userId;
        } else {
          // Fallback to session-based auth
          const session = sessions.get(token);
          if (session && session.expiresAt > new Date()) {
            currentUserId = session.userId;
          }
        }
      }
      
      if (currentUserId) {
        const userLikes = await storage.getUserLikes(currentUserId);
        const userBookmarks = await storage.getUserBookmarks(currentUserId, 0, 1000);
        const bookmarkedPostIds = userBookmarks.map(post => post.id);
        
        posts.forEach(post => {
          post.isLiked = userLikes.some(like => like.postId === post.id);
          post.isBookmarked = bookmarkedPostIds.includes(post.id);
        });
      }

      res.json(posts);
    } catch (error) {
      console.error('Get user posts error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Bookmark routes
  app.post('/api/posts/:postId/bookmark', requireAuth, async (req: any, res) => {
    try {
      const { postId } = req.params;
      const isBookmarked = await storage.toggleBookmark(req.user.userId, postId);
      
      // Create notification for post author if bookmarked
      if (isBookmarked) {
        const post = await storage.getPost(postId);
        if (post && post.author.id !== req.user.userId) {
          await storage.createNotification(
            post.author.id,
            'bookmark',
            `${req.user.username} bookmarked your post`,
            postId,
            req.user.userId
          );
        }
      }
      
      res.json({ isBookmarked });
    } catch (error) {
      console.error('Toggle bookmark error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user bookmarks
  app.get('/api/bookmarks', requireAuth, async (req: any, res) => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const bookmarks = await storage.getUserBookmarks(req.user.userId, offset, limit);
      
      // Mark all as bookmarked and check likes
      const userLikes = await storage.getUserLikes(req.user.userId);
      bookmarks.forEach(post => {
        post.isBookmarked = true;
        post.isLiked = userLikes.some(like => like.postId === post.id);
      });
      
      res.json(bookmarks);
    } catch (error) {
      console.error('Get bookmarks error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Notification routes
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const notifications = await storage.getUserNotifications(req.user.userId, offset, limit);
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Mark notification as read
  app.put('/api/notifications/:notificationId/read', requireAuth, async (req: any, res) => {
    try {
      const { notificationId } = req.params;
      const success = await storage.markNotificationAsRead(notificationId, req.user.userId);
      
      if (!success) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Mark all notifications as read
  app.put('/api/notifications/read-all', requireAuth, async (req: any, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user.userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/unread-count', requireAuth, async (req: any, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user.userId);
      res.json({ count });
    } catch (error) {
      console.error('Get unread notification count error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update post
  app.put('/api/posts/:postId', requireAuth, async (req: any, res) => {
    try {
      const { postId } = req.params;
      const { content } = req.body;
      
      const success = await storage.updatePost(postId, req.user.userId, content);
      if (!success) {
        return res.status(403).json({ message: 'You can only edit your own posts' });
      }
      
      // Broadcast post update
      broadcast({ type: 'POST_UPDATED', postId });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Update post error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete comment
  app.delete('/api/comments/:commentId', requireAuth, async (req: any, res) => {
    try {
      const { commentId } = req.params;
      const success = await storage.deleteComment(commentId, req.user.userId);
      
      if (!success) {
        return res.status(403).json({ message: 'You can only delete your own comments' });
      }
      
      // Broadcast comment deletion
      broadcast({ type: 'COMMENT_DELETED', commentId });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Analytics endpoint
  app.get('/api/analytics/stats', requireAuth, async (req: any, res) => {
    try {
      const stats = await storage.getUserStats(req.user.userId);
      res.json(stats);
    } catch (error) {
      console.error('Get analytics stats error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // DM Routes
  
  // Generate user keys on registration/first DM
  app.post('/api/dm/keys', requireAuth, async (req: any, res) => {
    try {
      const { publicKey, encryptedPrivateKey } = req.body;
      
      if (!publicKey || !encryptedPrivateKey) {
        return res.status(400).json({ message: 'Public key and encrypted private key are required' });
      }
      
      const success = await storage.createUserKeys(req.user.userId, publicKey, encryptedPrivateKey);
      
      if (!success) {
        return res.status(409).json({ message: 'User keys already exist' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Create user keys error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user's public key
  app.get('/api/dm/keys/:userId', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const userKeys = await storage.getUserPublicKey(userId);
      
      if (!userKeys) {
        return res.status(404).json({ message: 'User keys not found' });
      }
      
      res.json({ publicKey: userKeys.publicKey });
    } catch (error) {
      console.error('Get user public key error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user's own keys
  app.get('/api/dm/keys', requireAuth, async (req: any, res) => {
    try {
      const userKeys = await storage.getUserKeys(req.user.userId);
      
      if (!userKeys) {
        return res.status(404).json({ message: 'User keys not found' });
      }
      
      res.json(userKeys);
    } catch (error) {
      console.error('Get user keys error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get conversations list
  app.get('/api/dm/conversations', requireAuth, async (req: any, res) => {
    try {
      const conversations = await storage.getUserConversations(req.user.userId);
      res.json(conversations);
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get conversation messages
  app.get('/api/dm/conversations/:conversationId/messages', requireAuth, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Verify user is part of this conversation
      const isParticipant = await storage.isConversationParticipant(conversationId, req.user.userId);
      if (!isParticipant) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const messages = await storage.getConversationMessages(conversationId, page, limit);
      res.json(messages);
    } catch (error) {
      console.error('Get conversation messages error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Send message
  app.post('/api/dm/messages', requireAuth, async (req: any, res) => {
    try {
      const data = req.body;
      const validatedData = insertMessageSchema.parse(data);
      
      let conversationId = validatedData.conversationId;
      
      // If no conversation ID, create new conversation
      if (!conversationId && validatedData.recipientId) {
        conversationId = await storage.createConversation(req.user.userId, validatedData.recipientId);
      }
      
      if (!conversationId) {
        return res.status(400).json({ message: 'Conversation ID or recipient ID required' });
      }
      
      // Get participants
      const participants = await storage.getConversationParticipants(conversationId);
      const recipient = participants.find(p => p.id !== req.user.userId);
      
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
      
      // Check that both users have encryption keys
      const senderKeys = await storage.getUserKeys(req.user.userId);
      const recipientKeys = await storage.getUserKeys(recipient.id);
      
      if (!senderKeys) {
        return res.status(400).json({ message: 'Sender has not set up encryption keys' });
      }
      
      if (!recipientKeys) {
        return res.status(400).json({ message: 'Recipient has not set up encryption keys. Ask them to visit the Messages page first.' });
      }
      
      // The client should send us the encrypted content
      const { 
        encryptedContent, 
        encryptedKey, 
        iv,
        senderEncryptedContent,
        senderEncryptedKey,
        senderIv
      } = req.body;
      
      if (!encryptedContent || !encryptedKey || !iv) {
        return res.status(400).json({ message: 'Encrypted message data required' });
      }
      
      // Create the message with both encrypted versions
      const message = await storage.createMessage(
        conversationId,
        req.user.userId,
        encryptedContent,
        encryptedKey,
        iv,
        senderEncryptedContent,
        senderEncryptedKey,
        senderIv
      );
      
      // Broadcast to WebSocket clients
      broadcast({
        type: 'NEW_MESSAGE',
        conversationId,
        message,
        recipientId: recipient.id
      });
      
      res.json({ ...message, conversationId });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Mark messages as read
  app.put('/api/dm/conversations/:conversationId/read', requireAuth, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      
      // Verify user is part of this conversation
      const isParticipant = await storage.isConversationParticipant(conversationId, req.user.userId);
      if (!isParticipant) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      await storage.markMessagesAsRead(conversationId, req.user.userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Mark messages as read error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Search users for new conversation
  app.get('/api/dm/users/search', requireAuth, async (req: any, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.json([]);
      }
      
      const users = await storage.searchUsersForDM(query, req.user.userId);
      res.json(users);
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Test endpoint to check if user has encryption keys
  app.get('/api/dm/test-keys/:userId?', requireAuth, async (req: any, res) => {
    try {
      const userId = req.params.userId || req.user.userId;
      const userKeys = await storage.getUserKeys(userId);
      
      res.json({
        hasKeys: !!userKeys,
        keyInfo: userKeys ? {
          id: userKeys.id,
          userId: userKeys.userId,
          hasPublicKey: !!userKeys.publicKey,
          hasPrivateKey: !!userKeys.encryptedPrivateKey,
          keyVersion: userKeys.keyVersion,
          createdAt: userKeys.createdAt
        } : null
      });
    } catch (error) {
      console.error('Test keys error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get unread message count
  app.get('/api/dm/unread-count', requireAuth, async (req: any, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user.userId);
      res.json({ count });
    } catch (error) {
      console.error('Get unread message count error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Mark messages as seen when user opens a conversation
  app.post('/api/dm/conversations/:conversationId/mark-seen', requireAuth, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      await storage.markConversationMessagesAsSeen(conversationId, req.user.userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Mark messages as seen error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Mark specific message as seen (for read receipts)
  app.post('/api/dm/messages/:messageId/mark-seen', requireAuth, async (req: any, res) => {
    try {
      const { messageId } = req.params;
      await storage.markMessageAsSeen(messageId);
      res.json({ success: true });
    } catch (error) {
      console.error('Mark message as seen error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return httpServer;
}
