import { type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment, type Like, type Follow, type PostWithAuthor, type CommentWithAuthor, type UserWithFollowInfo, type Notification, type Bookmark, type PostStats, type Mention, type Conversation, type Message, type ConversationWithParticipant, type MessageWithSender } from "@shared/schema";

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
  getComment(commentId: string): Promise<CommentWithAuthor | undefined>;
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
  
  // Mention methods
  createMention(mentionedUserId: string, mentionedByUserId: string, postId?: string, commentId?: string): Promise<Mention>;
  getUsersByUsernames(usernames: string[]): Promise<User[]>;
  
  // DM methods
  createConversation(participant1Id: string, participant2Id: string): Promise<string>;
  getUserConversations(userId: string): Promise<ConversationWithParticipant[]>;
  getConversationParticipants(conversationId: string): Promise<User[]>;
  isConversationParticipant(conversationId: string, userId: string): Promise<boolean>;
  createMessage(
    conversationId: string, 
    senderId: string, 
    content: string
  ): Promise<MessageWithSender>;
  getConversationMessages(conversationId: string, page: number, limit: number): Promise<MessageWithSender[]>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  searchUsersForDM(query: string, currentUserId: string): Promise<User[]>;
  getUnreadMessageCount(userId: string): Promise<number>;
  markMessageAsSeen(messageId: string): Promise<void>;
  markConversationMessagesAsSeen(conversationId: string, userId: string): Promise<void>;
}

import { PostgreSQLStorage } from './postgres-storage.js';

// Create storage instance - always use PostgreSQL
function createStorage(): IStorage {
  return new PostgreSQLStorage();
}

export const storage = createStorage();
