import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertPostSchema, insertCommentSchema } from "@shared/schema";
import { z } from "zod";

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

// Helper function to hash passwords (simple for demo - use bcrypt in production)
function hashPassword(password: string): string {
  // For demo purposes, just return the password
  // In production, use: return bcrypt.hashSync(password, 10);
  return password;
}

function verifyPassword(password: string, hash: string): boolean {
  // For demo purposes, just compare directly
  // In production, use: return bcrypt.compareSync(password, hash);
  return password === hash;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
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
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    const session = sessionId ? sessions.get(sessionId) : null;
    
    if (!session) {
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
      const hashedUserData = {
        ...userData,
        password: hashPassword(userData.password)
      };
      
      const user = await storage.createUser(hashedUserData);
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      sessions.set(sessionId, { userId: user.id, username: user.username, expiresAt });
      
      res.json({ 
        user: { id: user.id, username: user.username, bio: user.bio, isAI: user.isAI },
        sessionId 
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle validation errors
      if (error.name === 'ZodError') {
        const firstError = error.errors[0];
        return res.status(400).json({ 
          message: firstError.message,
          field: firstError.path[0],
          details: firstError.message
        });
      }
      
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
      
      const passwordValid = verifyPassword(password, user.password);
      console.log('Password valid:', passwordValid);
      
      if (!passwordValid) {
        return res.status(401).json({ 
          message: "Invalid credentials", 
          field: "password",
          details: "Incorrect password. Please check your password and try again."
        });
      }
      
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      sessions.set(sessionId, { userId: user.id, username: user.username, expiresAt });
      
      console.log('Login successful for:', username);
      res.json({ 
        user: { id: user.id, username: user.username, bio: user.bio, isAI: user.isAI },
        sessionId 
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
      if (!verifyPassword(currentPassword, user.password)) {
        return res.status(401).json({ 
          message: "Invalid current password",
          details: "The current password you entered is incorrect."
        });
      }
      
      // Update password
      const hashedPassword = hashPassword(newPassword);
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
      
      const sessionId = req.headers.authorization?.replace('Bearer ', '');
      const session = sessionId ? sessions.get(sessionId) : null;
      
      let posts;
      if (feed === 'following' && session) {
        posts = await storage.getFollowingPosts(session.userId, offset, limit);
      } else {
        posts = await storage.getPosts(offset, limit);
      }
      
      // Get user likes and bookmarks if authenticated
      if (session) {
        const userLikes = await storage.getUserLikes(session.userId);
        const userBookmarks = await storage.getUserBookmarks(session.userId, 0, 1000);
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

  // Get individual post by ID (for sharing)
  app.get("/api/posts/:postId", async (req, res) => {
    try {
      const { postId } = req.params;
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Get user likes and bookmarks if authenticated
      const sessionId = req.headers.authorization?.replace('Bearer ', '');
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (session) {
        const userLikes = await storage.getUserLikes(session.userId);
        const userBookmarks = await storage.getUserBookmarks(session.userId, 0, 1000);
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
      
      // Get full post with author for broadcast
      const fullPost = await storage.getPost(post.id);
      
      // Broadcast new post to all connected clients
      broadcast({ type: 'NEW_POST', post: fullPost });
      
      res.json(post);
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
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
      const isLiked = await storage.togglePostLike(req.user.userId, postId);
      
      // Create notification for post author if liked
      if (isLiked) {
        const post = await storage.getPost(postId);
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
      const post = await storage.getPost(postId);
      broadcast({ type: 'POST_LIKED', postId, likeCount: post?.likeCount || 0 });
      
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
      
      // Get user likes if authenticated
      const sessionId = req.headers.authorization?.replace('Bearer ', '');
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (session) {
        const userLikes = await storage.getUserLikes(session.userId);
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
      
      // Create notification for post author
      const post = await storage.getPost(postId);
      if (post && post.author.id !== req.user.userId) {
        await storage.createNotification(
          post.author.id,
          'comment',
          `${req.user.username} commented on your post`,
          postId,
          req.user.userId
        );
      }
      
      // Get comment with author
      const comments = await storage.getCommentsByPostId(postId);
      const newComment = comments.find(c => c.id === comment.id);
      
      // Broadcast new comment
      broadcast({ type: 'NEW_COMMENT', comment: newComment, postId });
      
      res.json(comment);
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/comments/:commentId/like", requireAuth, async (req: any, res) => {
    try {
      const { commentId } = req.params;
      const isLiked = await storage.toggleCommentLike(req.user.userId, commentId);
      
      // Get updated comment for broadcast
      const comments = Array.from((storage as any).comments.values());
      const comment = comments.find((c: any) => c.id === commentId) as any;
      broadcast({ type: 'COMMENT_LIKED', commentId, likeCount: comment?.likeCount || 0 });
      
      res.json({ isLiked });
    } catch (error) {
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
      
      // Get user likes if authenticated
      const sessionId = req.headers.authorization?.replace('Bearer ', '');
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (session) {
        const userLikes = await storage.getUserLikes(session.userId);
        const userBookmarks = await storage.getUserBookmarks(session.userId, 0, 1000);
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

  // Trending posts
  app.get('/api/posts/trending', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const posts = await storage.getTrendingPosts(limit);
      
      // Get user likes if authenticated
      const sessionId = req.headers.authorization?.replace('Bearer ', '');
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (session) {
        const userLikes = await storage.getUserLikes(session.userId);
        const userBookmarks = await storage.getUserBookmarks(session.userId, 0, 1000);
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

  return httpServer;
}
