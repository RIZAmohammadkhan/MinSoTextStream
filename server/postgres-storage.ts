import { type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment, type Like, type Follow, type PostWithAuthor, type CommentWithAuthor, type UserWithFollowInfo, type Notification, type Bookmark, type PostStats, users, posts, comments, likes, follows, notifications, bookmarks } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, ilike, ne, count } from "drizzle-orm";
import { IStorage } from "./storage";

export class PostgreSQLStorage implements IStorage {
  // Helper function to create a public user object (without password)
  private createPublicUser(user: User): Omit<User, 'password'> & { password: string } {
    return {
      id: user.id,
      username: user.username,
      password: '', // Don't expose real password
      bio: user.bio,
      isAI: user.isAI,
      createdAt: user.createdAt
    };
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Post methods
  async getPosts(offset: number, limit: number): Promise<PostWithAuthor[]> {
    const result = await db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
        author: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .offset(offset)
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      content: row.content,
      authorId: row.authorId,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      createdAt: row.createdAt,
      author: this.createPublicUser(row.author),
      isLiked: false, // Will be set by the caller based on current user
      isBookmarked: false, // Will be set by the caller based on current user
    }));
  }

  async getFollowingPosts(userId: string, offset: number, limit: number): Promise<PostWithAuthor[]> {
    const result = await db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
        author: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(follows, eq(follows.followingId, posts.authorId))
      .where(eq(follows.followerId, userId))
      .orderBy(desc(posts.createdAt))
      .offset(offset)
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      content: row.content,
      authorId: row.authorId,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      createdAt: row.createdAt,
      author: this.createPublicUser(row.author),
      isLiked: false,
      isBookmarked: false,
    }));
  }

  async getUserPosts(userId: string, offset: number, limit: number): Promise<PostWithAuthor[]> {
    const result = await db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
        author: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.authorId, userId))
      .orderBy(desc(posts.createdAt))
      .offset(offset)
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      content: row.content,
      authorId: row.authorId,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      createdAt: row.createdAt,
      author: this.createPublicUser(row.author),
      isLiked: false,
      isBookmarked: false,
    }));
  }

  async getPost(id: string): Promise<PostWithAuthor | undefined> {
    const result = await db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
        author: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, id))
      .limit(1);

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      id: row.id,
      content: row.content,
      authorId: row.authorId,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      createdAt: row.createdAt,
      author: this.createPublicUser(row.author),
      isLiked: false,
      isBookmarked: false,
    };
  }

  async createPost(post: InsertPost, authorId: string): Promise<Post> {
    const result = await db.insert(posts).values({
      ...post,
      authorId,
    }).returning();
    return result[0];
  }

  async updatePost(postId: string, userId: string, content: string): Promise<boolean> {
    const result = await db
      .update(posts)
      .set({ content })
      .where(and(eq(posts.id, postId), eq(posts.authorId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.authorId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Comment methods
  async getCommentsByPostId(postId: string): Promise<CommentWithAuthor[]> {
    const result = await db
      .select({
        id: comments.id,
        content: comments.content,
        authorId: comments.authorId,
        postId: comments.postId,
        likeCount: comments.likeCount,
        createdAt: comments.createdAt,
        author: users,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt));

    return result.map(row => ({
      id: row.id,
      content: row.content,
      authorId: row.authorId,
      postId: row.postId,
      likeCount: row.likeCount,
      createdAt: row.createdAt,
      author: this.createPublicUser(row.author),
      isLiked: false,
    }));
  }

  async createComment(comment: InsertComment, authorId: string): Promise<Comment> {
    const result = await db.insert(comments).values({
      ...comment,
      authorId,
    }).returning();

    // Update comment count for the post
    await db
      .update(posts)
      .set({ commentCount: sql`${posts.commentCount} + 1` })
      .where(eq(posts.id, comment.postId));

    return result[0];
  }

  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    // First get the comment to know which post to update
    const comment = await db
      .select({ postId: comments.postId })
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.authorId, userId)))
      .limit(1);

    if (comment.length === 0) return false;

    const result = await db
      .delete(comments)
      .where(and(eq(comments.id, commentId), eq(comments.authorId, userId)));

    if ((result.rowCount ?? 0) > 0) {
      // Update comment count for the post
      await db
        .update(posts)
        .set({ commentCount: sql`${posts.commentCount} - 1` })
        .where(eq(posts.id, comment[0].postId));
      return true;
    }

    return false;
  }

  // Like methods
  async togglePostLike(userId: string, postId: string): Promise<boolean> {
    // Check if like already exists
    const existingLike = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
      .limit(1);

    if (existingLike.length > 0) {
      // Unlike
      await db
        .delete(likes)
        .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
      
      await db
        .update(posts)
        .set({ likeCount: sql`${posts.likeCount} - 1` })
        .where(eq(posts.id, postId));
      
      return false;
    } else {
      // Like
      await db.insert(likes).values({
        userId,
        postId,
      });
      
      await db
        .update(posts)
        .set({ likeCount: sql`${posts.likeCount} + 1` })
        .where(eq(posts.id, postId));
      
      return true;
    }
  }

  async toggleCommentLike(userId: string, commentId: string): Promise<boolean> {
    // Check if like already exists
    const existingLike = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.commentId, commentId)))
      .limit(1);

    if (existingLike.length > 0) {
      // Unlike
      await db
        .delete(likes)
        .where(and(eq(likes.userId, userId), eq(likes.commentId, commentId)));
      
      await db
        .update(comments)
        .set({ likeCount: sql`${comments.likeCount} - 1` })
        .where(eq(comments.id, commentId));
      
      return false;
    } else {
      // Like
      await db.insert(likes).values({
        userId,
        commentId,
      });
      
      await db
        .update(comments)
        .set({ likeCount: sql`${comments.likeCount} + 1` })
        .where(eq(comments.id, commentId));
      
      return true;
    }
  }

  async getUserLikes(userId: string): Promise<Like[]> {
    return await db.select().from(likes).where(eq(likes.userId, userId));
  }

  // Follow methods
  async searchUsers(query: string, currentUserId: string, limit: number): Promise<UserWithFollowInfo[]> {
    const result = await db
      .select({
        user: users,
        isFollowing: sql<boolean>`CASE WHEN ${follows.id} IS NOT NULL THEN true ELSE false END`,
      })
      .from(users)
      .leftJoin(follows, and(
        eq(follows.followerId, currentUserId),
        eq(follows.followingId, users.id)
      ))
      .where(and(
        ilike(users.username, `%${query}%`),
        ne(users.id, currentUserId)
      ))
      .limit(limit);

    // Get follower and following counts for each user
    const userWithCounts = await Promise.all(
      result.map(async (row) => {
        const [followerCount, followingCount] = await Promise.all([
          db.select({ count: count() }).from(follows).where(eq(follows.followingId, row.user.id)),
          db.select({ count: count() }).from(follows).where(eq(follows.followerId, row.user.id)),
        ]);

        return {
          ...this.createPublicUser(row.user),
          isFollowing: row.isFollowing,
          followerCount: followerCount[0].count,
          followingCount: followingCount[0].count,
        };
      })
    );

    return userWithCounts;
  }

  async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
    // Check if follow relationship already exists
    const existingFollow = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);

    if (existingFollow.length > 0) {
      // Unfollow
      await db
        .delete(follows)
        .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
      return false;
    } else {
      // Follow
      await db.insert(follows).values({
        followerId,
        followingId,
      });
      return true;
    }
  }

  async getFollowers(userId: string): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));

    return result.map(row => row.user);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));

    return result.map(row => row.user);
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const result = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));

    return result.map(row => row.followingId);
  }

  // Bookmark methods
  async toggleBookmark(userId: string, postId: string): Promise<boolean> {
    // Check if bookmark already exists
    const existingBookmark = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)))
      .limit(1);

    if (existingBookmark.length > 0) {
      // Remove bookmark
      await db
        .delete(bookmarks)
        .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)));
      return false;
    } else {
      // Add bookmark
      await db.insert(bookmarks).values({
        userId,
        postId,
      });
      return true;
    }
  }

  async getUserBookmarks(userId: string, offset: number, limit: number): Promise<PostWithAuthor[]> {
    const result = await db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
        author: users,
      })
      .from(bookmarks)
      .innerJoin(posts, eq(bookmarks.postId, posts.id))
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt))
      .offset(offset)
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      content: row.content,
      authorId: row.authorId,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      createdAt: row.createdAt,
      author: this.createPublicUser(row.author),
      isLiked: false,
      isBookmarked: true,
    }));
  }

  // Notification methods
  async createNotification(userId: string, type: string, message: string, relatedPostId?: string, relatedUserId?: string): Promise<Notification> {
    const result = await db.insert(notifications).values({
      userId,
      type,
      message,
      relatedPostId,
      relatedUserId,
    }).returning();
    return result[0];
  }

  async getUserNotifications(userId: string, offset: number, limit: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .offset(offset)
      .limit(limit);
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return result[0].count;
  }

  // Analytics methods
  async getUserStats(userId: string): Promise<PostStats> {
    const [postsResult, likesResult, commentsResult] = await Promise.all([
      db.select({ count: count() }).from(posts).where(eq(posts.authorId, userId)),
      db.select({ totalLikes: sql<number>`COALESCE(SUM(${posts.likeCount}), 0)` }).from(posts).where(eq(posts.authorId, userId)),
      db.select({ totalComments: sql<number>`COALESCE(SUM(${posts.commentCount}), 0)` }).from(posts).where(eq(posts.authorId, userId)),
    ]);

    const totalPosts = postsResult[0].count;
    const totalLikes = likesResult[0].totalLikes;
    const totalComments = commentsResult[0].totalComments;
    const engagement = totalPosts > 0 ? (totalLikes + totalComments) / totalPosts : 0;

    return {
      totalPosts,
      totalLikes,
      totalComments,
      engagement,
    };
  }

  async getTrendingPosts(limit: number): Promise<PostWithAuthor[]> {
    const result = await db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
        author: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(sql`${posts.likeCount} + ${posts.commentCount}`))
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      content: row.content,
      authorId: row.authorId,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      createdAt: row.createdAt,
      author: this.createPublicUser(row.author),
      isLiked: false,
      isBookmarked: false,
    }));
  }
}
