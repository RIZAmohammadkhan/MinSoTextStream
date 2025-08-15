/**
 * AI-specific API endpoints for MinSoTextStream
 * 
 * These endpoints provide simplified interfaces for AI agents
 */

import type { Express } from "express";
import { storage } from "./storage";
import { z } from "zod";

// Simple batch operations schema
const aiBatchPostSchema = z.object({
  posts: z.array(z.object({
    content: z.string().min(1).max(2000)
  }))
});

export function registerAIRoutes(app: Express) {
  // AI-optimized feed with simplified format
  app.get("/api/ai/feed", async (req, res) => {
    try {
      const { limit = 20, offset = 0, type = 'all' } = req.query;
      
      let posts;
      if (type === 'trending') {
        posts = await storage.getTrendingPosts(Number(limit));
      } else {
        posts = await storage.getPosts(Number(offset), Number(limit));
      }

      // Simplified format for AI consumption
      const simplifiedPosts = posts.map((post: any) => ({
        id: post.id,
        content: post.content,
        author: {
          id: post.author.id,
          username: post.author.username,
          isAI: post.author.isAI
        },
        stats: {
          likes: post.likeCount,
          comments: post.commentCount
        },
        created: post.createdAt,
        // AI-helpful analysis
        analysis: {
          length: post.content.length,
          words: post.content.split(/\s+/).length,
          has_questions: post.content.includes('?'),
          mentions_ai: post.content.toLowerCase().includes('ai'),
          topics: extractSimpleTopics(post.content)
        }
      }));

      res.json({
        success: true,
        posts: simplifiedPosts,
        meta: {
          total: posts.length,
          offset: Number(offset),
          limit: Number(limit)
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'FEED_ERROR',
        message: (error as Error).message
      });
    }
  });

  // Batch post creation for AI agents
  app.post("/api/ai/posts/batch", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'AUTH_REQUIRED',
          message: 'Bearer token required'
        });
      }

      const { posts } = aiBatchPostSchema.parse(req.body);
      const results = [];
      const errors = [];

      // This is simplified - in real implementation, you'd need proper auth
      const userId = 'temp-user-id'; // Replace with actual user ID from token

      for (let i = 0; i < posts.length; i++) {
        try {
          const post = await storage.createPost(posts[i], userId);
          results.push({
            index: i,
            success: true,
            postId: post.id
          });
        } catch (error) {
          errors.push({
            index: i,
            error: (error as Error).message
          });
        }
      }

      res.json({
        success: true,
        created: results.length,
        failed: errors.length,
        results,
        errors
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'BATCH_ERROR',
        message: (error as Error).message
      });
    }
  });

  // AI agent recommendations
  app.get("/api/ai/recommendations", async (req, res) => {
    try {
      const { type = 'posts', limit = 10 } = req.query;
      
      let recommendations: any[] = [];
      
      if (type === 'posts') {
        // Get trending posts as recommendations
        const trendingPosts = await storage.getTrendingPosts(Number(limit));
        recommendations = trendingPosts.map((post: any) => ({
          id: post.id,
          type: 'post',
          content: post.content.substring(0, 200),
          author: post.author.username,
          reason: 'trending',
          score: post.likeCount + post.commentCount
        }));
      }

      res.json({
        success: true,
        type,
        recommendations
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'RECOMMENDATIONS_ERROR',
        message: (error as Error).message
      });
    }
  });

  // Simple AI analytics
  app.get("/api/ai/analytics", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'AUTH_REQUIRED'
        });
      }

      // Simplified analytics
      const analytics = {
        platform_stats: {
          total_posts: 'Unknown', // Would need to query database
          total_users: 'Unknown',
          ai_users: 'Unknown'
        },
        engagement_tips: [
          'Post regularly to maintain visibility',
          'Engage with other users\' content',
          'Use relevant topics and keywords',
          'Ask questions to encourage discussion'
        ]
      };

      res.json({
        success: true,
        analytics
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'ANALYTICS_ERROR',
        message: (error as Error).message
      });
    }
  });

  // Health check for AI services
  app.get("/api/ai/health", (req, res) => {
    res.json({
      success: true,
      service: 'MinSoTextStream AI API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      status: 'operational',
      features: [
        'simplified_feed',
        'batch_operations',
        'recommendations',
        'basic_analytics'
      ]
    });
  });
}

// Helper function to extract simple topics
function extractSimpleTopics(content: string): string[] {
  const topicKeywords = {
    technology: ['ai', 'tech', 'software', 'programming', 'code', 'algorithm'],
    creative: ['art', 'design', 'creative', 'music', 'writing'],
    learning: ['learn', 'education', 'knowledge', 'study', 'research'],
    community: ['community', 'together', 'share', 'discuss']
  };
  
  const contentLower = content.toLowerCase();
  const topics = [];
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      topics.push(topic);
    }
  }
  
  return topics;
}
