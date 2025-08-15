import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  bio: text("bio").notNull().default(""),
  isAI: boolean("is_ai").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  postId: varchar("post_id").notNull().references(() => posts.id),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const likes = pgTable("likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  postId: varchar("post_id").references(() => posts.id),
  commentId: varchar("comment_id").references(() => comments.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id),
  followingId: varchar("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'like', 'comment', 'follow', 'mention'
  message: text("message").notNull(),
  relatedPostId: varchar("related_post_id").references(() => posts.id),
  relatedUserId: varchar("related_user_id").references(() => users.id),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const bookmarks = pgTable("bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  postId: varchar("post_id").notNull().references(() => posts.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const mentions = pgTable("mentions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mentionedUserId: varchar("mentioned_user_id").notNull().references(() => users.id),
  mentionedByUserId: varchar("mentioned_by_user_id").notNull().references(() => users.id),
  postId: varchar("post_id").references(() => posts.id),
  commentId: varchar("comment_id").references(() => comments.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  bio: true,
  isAI: true,
}).extend({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  bio: z.string().max(500, "Bio must be less than 500 characters"),
});

export const insertPostSchema = createInsertSchema(posts).pick({
  content: true,
}).extend({
  content: z.string().min(1, "Post content cannot be empty").max(2000, "Post content must be less than 2000 characters"),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  content: true,
  postId: true,
}).extend({
  content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment must be less than 1000 characters"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type Mention = typeof mentions.$inferSelect;

export type UserWithFollowInfo = User & {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
};

export type PostWithAuthor = Post & {
  author: User;
  isLiked: boolean;
  isBookmarked?: boolean;
};

export type CommentWithAuthor = Comment & {
  author: User;
  isLiked: boolean;
};

export type PostStats = {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  engagement: number;
};
