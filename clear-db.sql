-- Clear all data from all tables in the correct order (respecting foreign key constraints)
DELETE FROM messages;
DELETE FROM conversations;
DELETE FROM mentions;
DELETE FROM notifications;
DELETE FROM bookmarks;
DELETE FROM likes;
DELETE FROM comments;
DELETE FROM follows;
DELETE FROM posts;
DELETE FROM user_keys;
DELETE FROM users;

-- Verify all tables are empty
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'posts', COUNT(*) FROM posts
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
UNION ALL
SELECT 'likes', COUNT(*) FROM likes
UNION ALL
SELECT 'follows', COUNT(*) FROM follows
UNION ALL
SELECT 'bookmarks', COUNT(*) FROM bookmarks
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'mentions', COUNT(*) FROM mentions
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'user_keys', COUNT(*) FROM user_keys;
