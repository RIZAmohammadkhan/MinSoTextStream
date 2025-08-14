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
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getPosts(offset: number, limit: number): Promise<PostWithAuthor[]> {
    const allPosts = Array.from(this.posts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return allPosts.map(post => {
      const author = this.users.get(post.authorId);
      return {
        ...post,
        author: author!,
        isLiked: false // Will be updated based on current user
      };
    });
  }

  async getPost(id: string): Promise<PostWithAuthor | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;

    const author = this.users.get(post.authorId);
    if (!author) return undefined;

    return {
      ...post,
      author,
      isLiked: false
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
      createdAt: new Date()
    };
    this.posts.set(id, post);
    return post;
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post || post.authorId !== userId) {
      return false; // Can only delete own posts
    }
    
    // Delete the post
    this.posts.delete(postId);
    
    // Delete related comments
    const postComments = Array.from(this.comments.values()).filter(comment => comment.postId === postId);
    postComments.forEach(comment => this.comments.delete(comment.id));
    
    // Delete related likes
    const postLikes = Array.from(this.likes.values()).filter(like => like.postId === postId);
    postLikes.forEach(like => this.likes.delete(like.id));
    
    return true;
  }

  async getFollowingPosts(userId: string, offset: number, limit: number): Promise<PostWithAuthor[]> {
    const followingIds = await this.getFollowingIds(userId);
    followingIds.push(userId); // Include own posts
    
    const followingPosts = Array.from(this.posts.values())
      .filter(post => followingIds.includes(post.authorId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);

    return followingPosts.map(post => {
      const author = this.users.get(post.authorId);
      return {
        ...post,
        author: author!,
        isLiked: false // Will be updated based on current user
      };
    });
  }

  async getCommentsByPostId(postId: string): Promise<CommentWithAuthor[]> {
    const postComments = Array.from(this.comments.values())
      .filter(comment => comment.postId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return postComments.map(comment => {
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
      createdAt: new Date()
    };
    this.comments.set(id, comment);

    // Update comment count for the post
    const post = this.posts.get(insertComment.postId);
    if (post) {
      post.commentCount += 1;
      this.posts.set(post.id, post);
    }

    return comment;
  }

  async togglePostLike(userId: string, postId: string): Promise<boolean> {
    const existingLike = Array.from(this.likes.values()).find(
      like => like.userId === userId && like.postId === postId
    );

    const post = this.posts.get(postId);
    if (!post) return false;

    if (existingLike) {
      // Remove like
      this.likes.delete(existingLike.id);
      post.likeCount = Math.max(0, post.likeCount - 1);
      this.posts.set(postId, post);
      return false;
    } else {
      // Add like
      const likeId = randomUUID();
      const like: Like = {
        id: likeId,
        userId,
        postId,
        commentId: null,
        createdAt: new Date()
      };
      this.likes.set(likeId, like);
      post.likeCount += 1;
      this.posts.set(postId, post);
      return true;
    }
  }

  async toggleCommentLike(userId: string, commentId: string): Promise<boolean> {
    const existingLike = Array.from(this.likes.values()).find(
      like => like.userId === userId && like.commentId === commentId
    );

    const comment = this.comments.get(commentId);
    if (!comment) return false;

    if (existingLike) {
      // Remove like
      this.likes.delete(existingLike.id);
      comment.likeCount = Math.max(0, comment.likeCount - 1);
      this.comments.set(commentId, comment);
      return false;
    } else {
      // Add like
      const likeId = randomUUID();
      const like: Like = {
        id: likeId,
        userId,
        postId: null,
        commentId,
        createdAt: new Date()
      };
      this.likes.set(likeId, like);
      comment.likeCount += 1;
      this.comments.set(commentId, comment);
      return true;
    }
  }

  async getUserLikes(userId: string): Promise<Like[]> {
    return Array.from(this.likes.values()).filter(like => like.userId === userId);
  }

  async searchUsers(query: string, currentUserId: string, limit: number = 10): Promise<UserWithFollowInfo[]> {
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
    if (followerId === followingId) return false;

    const existingFollow = Array.from(this.follows.values()).find(
      follow => follow.followerId === followerId && follow.followingId === followingId
    );

    if (existingFollow) {
      // Unfollow
      this.follows.delete(existingFollow.id);
      return false;
    } else {
      // Follow
      const followId = randomUUID();
      const follow: Follow = {
        id: followId,
        followerId,
        followingId,
        createdAt: new Date()
      };
      this.follows.set(followId, follow);
      return true;
    }
  }

  async getFollowers(userId: string): Promise<User[]> {
    const followerIds = Array.from(this.follows.values())
      .filter(follow => follow.followingId === userId)
      .map(follow => follow.followerId);

    return followerIds.map(id => this.users.get(id)).filter(user => user !== undefined) as User[];
  }

  async getFollowing(userId: string): Promise<User[]> {
    const followingIds = Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);

    return followingIds.map(id => this.users.get(id)).filter(user => user !== undefined) as User[];
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    return Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);
  }

  // New methods to implement interface
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    // Delete user's posts
    const userPosts = Array.from(this.posts.values()).filter(post => post.authorId === id);
    userPosts.forEach(post => this.posts.delete(post.id));
    
    // Delete user's comments
    const userComments = Array.from(this.comments.values()).filter(comment => comment.authorId === id);
    userComments.forEach(comment => this.comments.delete(comment.id));
    
    // Delete user's likes
    const userLikes = Array.from(this.likes.values()).filter(like => like.userId === id);
    userLikes.forEach(like => this.likes.delete(like.id));
    
    // Delete user's follows
    const userFollows = Array.from(this.follows.values()).filter(follow => 
      follow.followerId === id || follow.followingId === id);
    userFollows.forEach(follow => this.follows.delete(follow.id));
    
    // Delete user's bookmarks
    const userBookmarks = Array.from(this.bookmarks.values()).filter(bookmark => bookmark.userId === id);
    userBookmarks.forEach(bookmark => this.bookmarks.delete(bookmark.id));
    
    // Delete user's notifications
    const userNotifications = Array.from(this.notifications.values()).filter(notification => notification.userId === id);
    userNotifications.forEach(notification => this.notifications.delete(notification.id));
    
    this.users.delete(id);
    return true;
  }

  async getUserPosts(userId: string, offset: number, limit: number): Promise<PostWithAuthor[]> {
    const userPosts = Array.from(this.posts.values())
      .filter(post => post.authorId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);

    return userPosts.map(post => {
      const author = this.users.get(post.authorId);
      return {
        ...post,
        author: author!,
        isLiked: false, // Will be updated based on current user
        isBookmarked: false
      };
    });
  }

  async updatePost(postId: string, userId: string, content: string): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post || post.authorId !== userId) return false;
    
    post.content = content;
    this.posts.set(postId, post);
    return true;
  }

  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment || comment.authorId !== userId) return false;
    
    this.comments.delete(commentId);
    
    // Update comment count for the post
    const post = this.posts.get(comment.postId);
    if (post) {
      post.commentCount = Math.max(0, post.commentCount - 1);
      this.posts.set(post.id, post);
    }
    
    return true;
  }

  async toggleBookmark(userId: string, postId: string): Promise<boolean> {
    const existingBookmark = Array.from(this.bookmarks.values()).find(
      bookmark => bookmark.userId === userId && bookmark.postId === postId
    );

    if (existingBookmark) {
      this.bookmarks.delete(existingBookmark.id);
      return false;
    } else {
      const bookmarkId = randomUUID();
      const bookmark: Bookmark = {
        id: bookmarkId,
        userId,
        postId,
        createdAt: new Date()
      };
      this.bookmarks.set(bookmarkId, bookmark);
      return true;
    }
  }

  async getUserBookmarks(userId: string, offset: number, limit: number): Promise<PostWithAuthor[]> {
    const userBookmarks = Array.from(this.bookmarks.values())
      .filter(bookmark => bookmark.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);

    const bookmarkedPosts = userBookmarks.map(bookmark => this.posts.get(bookmark.postId))
      .filter(post => post !== undefined) as Post[];

    return bookmarkedPosts.map(post => {
      const author = this.users.get(post.authorId);
      return {
        ...post,
        author: author!,
        isLiked: false, // Will be updated based on current user
        isBookmarked: true
      };
    });
  }

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
      createdAt: new Date()
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getUserNotifications(userId: string, offset: number, limit: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.userId !== userId) return false;
    
    notification.read = true;
    this.notifications.set(notificationId, notification);
    return true;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.read);
    
    userNotifications.forEach(notification => {
      notification.read = true;
      this.notifications.set(notification.id, notification);
    });
    
    return true;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.read)
      .length;
  }

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
      engagement: Math.round(engagement * 100) / 100
    };
  }

  async getTrendingPosts(limit: number): Promise<PostWithAuthor[]> {
    const posts = Array.from(this.posts.values())
      .sort((a, b) => {
        // Sort by engagement score (likes + comments) and recency
        const scoreA = a.likeCount + a.commentCount;
        const scoreB = b.likeCount + b.commentCount;
        if (scoreA === scoreB) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return scoreB - scoreA;
      })
      .slice(0, limit);

    return posts.map(post => {
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

export const storage = new MemStorage();
