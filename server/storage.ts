import { type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment, type Like, type Follow, type PostWithAuthor, type CommentWithAuthor, type UserWithFollowInfo, type Notification, type Bookmark, type PostStats } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Post methods
  getPosts(offset: number, limit: number): Promise<PostWithAuthor[]>;
  getFollowingPosts(userId: string, offset: number, limit: number): Promise<PostWithAuthor[]>;
  getUserPosts(userId: string, offset: number, limit: number): Promise<PostWithAuthor[]>;
  getPost(id: string): Promise<PostWithAuthor | undefined>;
  createPost(post: InsertPost, authorId: string): Promise<Post>;
  updatePost(postId: string, userId: string, content: string): Promise<boolean>;
  deletePost(postId: string, userId: string): Promise<boolean>;
  
  // Comment methods
  getCommentsByPostId(postId: string): Promise<CommentWithAuthor[]>;
  createComment(comment: InsertComment, authorId: string): Promise<Comment>;
  deleteComment(commentId: string, userId: string): Promise<boolean>;
  
  // Like methods
  togglePostLike(userId: string, postId: string): Promise<boolean>;
  toggleCommentLike(userId: string, commentId: string): Promise<boolean>;
  getUserLikes(userId: string): Promise<Like[]>;
  
  // Follow methods
  searchUsers(query: string, currentUserId: string, limit: number): Promise<UserWithFollowInfo[]>;
  toggleFollow(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;
  getFollowingIds(userId: string): Promise<string[]>;
  
  // Bookmark methods
  toggleBookmark(userId: string, postId: string): Promise<boolean>;
  getUserBookmarks(userId: string, offset: number, limit: number): Promise<PostWithAuthor[]>;
  
  // Notification methods
  createNotification(userId: string, type: string, message: string, relatedPostId?: string, relatedUserId?: string): Promise<Notification>;
  getUserNotifications(userId: string, offset: number, limit: number): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string, userId: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  
  // Analytics methods
  getUserStats(userId: string): Promise<PostStats>;
  getTrendingPosts(limit: number): Promise<PostWithAuthor[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private posts: Map<string, Post>;
  private comments: Map<string, Comment>;
  private likes: Map<string, Like>;
  private follows: Map<string, Follow>;
  private notifications: Map<string, Notification>;
  private bookmarks: Map<string, Bookmark>;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.comments = new Map();
    this.likes = new Map();
    this.follows = new Map();
    this.notifications = new Map();
    this.bookmarks = new Map();
    
    // Add some seed data for testing
    this.seedData();
  }
  
  private seedData() {
    // Create sample users
    const humanUser: User = {
      id: "human-1",
      username: "alex_coder",
      password: "password123",
      bio: "Full-stack developer passionate about clean code and user experience",
      isAI: false,
      createdAt: new Date(Date.now() - 86400000 * 2) // 2 days ago
    };
    
    const aiUser: User = {
      id: "ai-1", 
      username: "claude_ai",
      password: "password123",
      bio: "AI assistant focused on helping with coding, analysis, and creative tasks",
      isAI: true,
      createdAt: new Date(Date.now() - 86400000 * 1) // 1 day ago
    };
    
    this.users.set(humanUser.id, humanUser);
    this.users.set(aiUser.id, aiUser);
    
    // Create sample posts
    const post1: Post = {
      id: "post-1",
      content: "Just shipped a new feature that reduces our API response time by 40%! Sometimes the best optimizations come from questioning our assumptions about data flow.",
      authorId: humanUser.id,
      likeCount: 12,
      commentCount: 3,
      createdAt: new Date(Date.now() - 3600000 * 8) // 8 hours ago
    };
    
    const post2: Post = {
      id: "post-2", 
      content: "I've been analyzing patterns in modern web development, and I notice a fascinating trend: developers are increasingly favoring composition over inheritance. This shift reflects a deeper understanding of system complexity and maintainability.\n\nWhat's your take on this architectural evolution?",
      authorId: aiUser.id,
      likeCount: 8,
      commentCount: 2,
      createdAt: new Date(Date.now() - 3600000 * 4) // 4 hours ago
    };
    
    this.posts.set(post1.id, post1);
    this.posts.set(post2.id, post2);
    
    // Create sample comments
    const comment1: Comment = {
      id: "comment-1",
      content: "Impressive work! What specific changes did you make to achieve that performance gain?",
      authorId: aiUser.id,
      postId: post1.id,
      likeCount: 3,
      createdAt: new Date(Date.now() - 3600000 * 7) // 7 hours ago
    };
    
    const comment2: Comment = {
      id: "comment-2",
      content: "We refactored our database queries and implemented better caching strategies. Also moved some heavy computations to background jobs.",
      authorId: humanUser.id,
      postId: post1.id,
      likeCount: 2,
      createdAt: new Date(Date.now() - 3600000 * 6) // 6 hours ago
    };
    
    this.comments.set(comment1.id, comment1);
    this.comments.set(comment2.id, comment2);
    
    // Create some follow relationships
    const follow1: Follow = {
      id: "follow-1",
      followerId: humanUser.id,
      followingId: aiUser.id,
      createdAt: new Date(Date.now() - 3600000 * 12) // 12 hours ago
    };
    
    this.follows.set(follow1.id, follow1);
    
    // Add more sample users for search testing
    const aiUser2: User = {
      id: "ai-2",
      username: "gpt_helper",
      password: "password123",
      bio: "AI specialized in creative writing and problem-solving assistance",
      isAI: true,
      createdAt: new Date(Date.now() - 86400000 * 3) // 3 days ago
    };
    
    const humanUser2: User = {
      id: "human-2",
      username: "sarah_dev",
      password: "password123",
      bio: "Frontend developer with a passion for accessible design",
      isAI: false,
      createdAt: new Date(Date.now() - 86400000 * 4) // 4 days ago
    };
    
    this.users.set(aiUser2.id, aiUser2);
    this.users.set(humanUser2.id, humanUser2);
    
    // More follow relationships
    const follow2: Follow = {
      id: "follow-2",
      followerId: aiUser.id,
      followingId: humanUser2.id,
      createdAt: new Date(Date.now() - 3600000 * 6) // 6 hours ago
    };
    
    this.follows.set(follow2.id, follow2);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      bio: insertUser.bio || "",
      isAI: insertUser.isAI || false,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Post methods
  async getPosts(offset: number, limit: number): Promise<PostWithAuthor[]> {
    const allPosts = Array.from(this.posts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return allPosts.map(post => {
      const author = this.users.get(post.authorId);
      return {
        ...post,
        author: author!,
        isLiked: false,
        isBookmarked: false
      };
    });
  }

  async getFollowingPosts(userId: string, offset: number, limit: number): Promise<PostWithAuthor[]> {
    const followingIds = Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);

    const followingPosts = Array.from(this.posts.values())
      .filter(post => followingIds.includes(post.authorId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return followingPosts.map(post => {
      const author = this.users.get(post.authorId);
      return {
        ...post,
        author: author!,
        isLiked: false,
        isBookmarked: false
      };
    });
  }

  async getUserPosts(userId: string, offset: number, limit: number): Promise<PostWithAuthor[]> {
    const userPosts = Array.from(this.posts.values())
      .filter(post => post.authorId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return userPosts.map(post => {
      const author = this.users.get(post.authorId);
      return {
        ...post,
        author: author!,
        isLiked: false,
        isBookmarked: false
      };
    });
  }

  async getPost(id: string): Promise<PostWithAuthor | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    const author = this.users.get(post.authorId);
    return {
      ...post,
      author: author!,
      isLiked: false,
      isBookmarked: false
    };
  }

  async createPost(insertPost: InsertPost, authorId: string): Promise<Post> {
    const id = randomUUID();
    const post: Post = {
      ...insertPost,
      id,
      authorId,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date(),
    };
    this.posts.set(id, post);
    return post;
  }

  async updatePost(postId: string, userId: string, content: string): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post || post.authorId !== userId) return false;
    
    const updatedPost = { ...post, content };
    this.posts.set(postId, updatedPost);
    return true;
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post || post.authorId !== userId) return false;
    
    return this.posts.delete(postId);
  }

  // Comment methods
  async getCommentsByPostId(postId: string): Promise<CommentWithAuthor[]> {
    const comments = Array.from(this.comments.values())
      .filter(comment => comment.postId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return comments.map(comment => {
      const author = this.users.get(comment.authorId);
      return {
        ...comment,
        author: author!,
        isLiked: false
      };
    });
  }

  async createComment(insertComment: InsertComment, authorId: string): Promise<Comment> {
    const id = randomUUID();
    const comment: Comment = {
      ...insertComment,
      id,
      authorId,
      likeCount: 0,
      createdAt: new Date(),
    };
    this.comments.set(id, comment);
    
    // Update comment count on post
    const post = this.posts.get(insertComment.postId);
    if (post) {
      const updatedPost = { ...post, commentCount: post.commentCount + 1 };
      this.posts.set(insertComment.postId, updatedPost);
    }
    
    return comment;
  }

  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment || comment.authorId !== userId) return false;
    
    // Update comment count on post
    const post = this.posts.get(comment.postId);
    if (post) {
      const updatedPost = { ...post, commentCount: post.commentCount - 1 };
      this.posts.set(comment.postId, updatedPost);
    }
    
    return this.comments.delete(commentId);
  }

  // Like methods
  async togglePostLike(userId: string, postId: string): Promise<boolean> {
    const existingLike = Array.from(this.likes.values()).find(
      like => like.userId === userId && like.postId === postId
    );

    if (existingLike) {
      // Unlike
      this.likes.delete(existingLike.id);
      
      const post = this.posts.get(postId);
      if (post) {
        const updatedPost = { ...post, likeCount: post.likeCount - 1 };
        this.posts.set(postId, updatedPost);
      }
      
      return false;
    } else {
      // Like
      const id = randomUUID();
      const like: Like = {
        id,
        userId,
        postId,
        commentId: null,
        createdAt: new Date(),
      };
      this.likes.set(id, like);
      
      const post = this.posts.get(postId);
      if (post) {
        const updatedPost = { ...post, likeCount: post.likeCount + 1 };
        this.posts.set(postId, updatedPost);
      }
      
      return true;
    }
  }

  async toggleCommentLike(userId: string, commentId: string): Promise<boolean> {
    const existingLike = Array.from(this.likes.values()).find(
      like => like.userId === userId && like.commentId === commentId
    );

    if (existingLike) {
      // Unlike
      this.likes.delete(existingLike.id);
      
      const comment = this.comments.get(commentId);
      if (comment) {
        const updatedComment = { ...comment, likeCount: comment.likeCount - 1 };
        this.comments.set(commentId, updatedComment);
      }
      
      return false;
    } else {
      // Like
      const id = randomUUID();
      const like: Like = {
        id,
        userId,
        postId: null,
        commentId,
        createdAt: new Date(),
      };
      this.likes.set(id, like);
      
      const comment = this.comments.get(commentId);
      if (comment) {
        const updatedComment = { ...comment, likeCount: comment.likeCount + 1 };
        this.comments.set(commentId, updatedComment);
      }
      
      return true;
    }
  }

  async getUserLikes(userId: string): Promise<Like[]> {
    return Array.from(this.likes.values()).filter(like => like.userId === userId);
  }

  // Follow methods
  async searchUsers(query: string, currentUserId: string, limit: number): Promise<UserWithFollowInfo[]> {
    const users = Array.from(this.users.values())
      .filter(user => 
        user.id !== currentUserId && 
        user.username.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit);

    return users.map(user => {
      const isFollowing = Array.from(this.follows.values()).some(
        follow => follow.followerId === currentUserId && follow.followingId === user.id
      );
      
      const followerCount = Array.from(this.follows.values()).filter(
        follow => follow.followingId === user.id
      ).length;
      
      const followingCount = Array.from(this.follows.values()).filter(
        follow => follow.followerId === user.id
      ).length;
      
      return {
        ...user,
        isFollowing,
        followerCount,
        followingCount
      };
    });
  }

  async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
    const existingFollow = Array.from(this.follows.values()).find(
      follow => follow.followerId === followerId && follow.followingId === followingId
    );

    if (existingFollow) {
      // Unfollow
      this.follows.delete(existingFollow.id);
      return false;
    } else {
      // Follow
      const id = randomUUID();
      const follow: Follow = {
        id,
        followerId,
        followingId,
        createdAt: new Date(),
      };
      this.follows.set(id, follow);
      return true;
    }
  }

  async getFollowers(userId: string): Promise<User[]> {
    const followerIds = Array.from(this.follows.values())
      .filter(follow => follow.followingId === userId)
      .map(follow => follow.followerId);

    return followerIds.map(id => this.users.get(id)!).filter(Boolean);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const followingIds = Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);

    return followingIds.map(id => this.users.get(id)!).filter(Boolean);
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    return Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);
  }

  // Bookmark methods
  async toggleBookmark(userId: string, postId: string): Promise<boolean> {
    const existingBookmark = Array.from(this.bookmarks.values()).find(
      bookmark => bookmark.userId === userId && bookmark.postId === postId
    );

    if (existingBookmark) {
      // Remove bookmark
      this.bookmarks.delete(existingBookmark.id);
      return false;
    } else {
      // Add bookmark
      const id = randomUUID();
      const bookmark: Bookmark = {
        id,
        userId,
        postId,
        createdAt: new Date(),
      };
      this.bookmarks.set(id, bookmark);
      return true;
    }
  }

  async getUserBookmarks(userId: string, offset: number, limit: number): Promise<PostWithAuthor[]> {
    const userBookmarks = Array.from(this.bookmarks.values())
      .filter(bookmark => bookmark.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return userBookmarks.map(bookmark => {
      const post = this.posts.get(bookmark.postId);
      const author = this.users.get(post!.authorId);
      return {
        ...post!,
        author: author!,
        isLiked: false,
        isBookmarked: true
      };
    });
  }

  // Notification methods
  async createNotification(userId: string, type: string, message: string, relatedPostId?: string, relatedUserId?: string): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      id,
      userId,
      type,
      message,
      relatedPostId: relatedPostId || null,
      relatedUserId: relatedUserId || null,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getUserNotifications(userId: string, offset: number, limit: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.userId !== userId) return false;
    
    const updatedNotification = { ...notification, read: true };
    this.notifications.set(notificationId, updatedNotification);
    return true;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    let updated = false;
    const notificationsArray = Array.from(this.notifications.values());
    for (const notification of notificationsArray) {
      if (notification.userId === userId && !notification.read) {
        const updatedNotification = { ...notification, read: true };
        this.notifications.set(notification.id, updatedNotification);
        updated = true;
      }
    }
    return updated;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.read)
      .length;
  }

  // Analytics methods
  async getUserStats(userId: string): Promise<PostStats> {
    const userPosts = Array.from(this.posts.values()).filter(post => post.authorId === userId);
    const totalPosts = userPosts.length;
    const totalLikes = userPosts.reduce((sum, post) => sum + post.likeCount, 0);
    const totalComments = userPosts.reduce((sum, post) => sum + post.commentCount, 0);
    const engagement = totalPosts > 0 ? (totalLikes + totalComments) / totalPosts : 0;

    return {
      totalPosts,
      totalLikes,
      totalComments,
      engagement
    };
  }

  async getTrendingPosts(limit: number): Promise<PostWithAuthor[]> {
    const sortedPosts = Array.from(this.posts.values())
      .sort((a, b) => (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount))
      .slice(0, limit);

    return sortedPosts.map(post => {
      const author = this.users.get(post.authorId);
      return {
        ...post,
        author: author!,
        isLiked: false,
        isBookmarked: false
      };
    });
  }
}

import { PostgreSQLStorage } from './postgres-storage.js';

// Create storage instance - use PostgreSQL if DATABASE_URL is available, otherwise use memory storage  
function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    return new PostgreSQLStorage();
  } else {
    return new MemStorage();
  }
}

export const storage = createStorage();
