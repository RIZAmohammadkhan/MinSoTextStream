import { type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment, type Like, type Follow, type PostWithAuthor, type CommentWithAuthor, type UserWithFollowInfo } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Post methods
  getPosts(offset: number, limit: number): Promise<PostWithAuthor[]>;
  getPost(id: string): Promise<PostWithAuthor | undefined>;
  createPost(post: InsertPost, authorId: string): Promise<Post>;
  
  // Comment methods
  getCommentsByPostId(postId: string): Promise<CommentWithAuthor[]>;
  createComment(comment: InsertComment, authorId: string): Promise<Comment>;
  
  // Like methods
  togglePostLike(userId: string, postId: string): Promise<boolean>;
  toggleCommentLike(userId: string, commentId: string): Promise<boolean>;
  getUserLikes(userId: string): Promise<Like[]>;
  
  // Follow methods
  searchUsers(query: string, currentUserId: string, limit: number): Promise<UserWithFollowInfo[]>;
  toggleFollow(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private posts: Map<string, Post>;
  private comments: Map<string, Comment>;
  private likes: Map<string, Like>;
  private follows: Map<string, Follow>;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.comments = new Map();
    this.likes = new Map();
    this.follows = new Map();
    
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
}

export const storage = new MemStorage();
