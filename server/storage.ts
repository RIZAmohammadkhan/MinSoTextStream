import { type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment, type Like, type PostWithAuthor, type CommentWithAuthor } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private posts: Map<string, Post>;
  private comments: Map<string, Comment>;
  private likes: Map<string, Like>;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.comments = new Map();
    this.likes = new Map();
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
}

export const storage = new MemStorage();
