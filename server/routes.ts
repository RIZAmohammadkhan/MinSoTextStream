import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertPostSchema, insertCommentSchema } from "@shared/schema";
import { z } from "zod";

// Simple session store for demo purposes
const sessions = new Map<string, { userId: string; username: string }>();

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
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, { userId: user.id, username: user.username });
      
      res.json({ 
        user: { id: user.id, username: user.username, bio: user.bio, isAI: user.isAI },
        sessionId 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, { userId: user.id, username: user.username });
      
      res.json({ 
        user: { id: user.id, username: user.username, bio: user.bio, isAI: user.isAI },
        sessionId 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/auth/logout", requireAuth, (req: any, res) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ success: true });
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
      
      // Get user likes if authenticated
      if (session) {
        const userLikes = await storage.getUserLikes(session.userId);
        posts.forEach(post => {
          post.isLiked = userLikes.some(like => like.postId === post.id);
        });
      }
      
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch posts" });
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

  return httpServer;
}
