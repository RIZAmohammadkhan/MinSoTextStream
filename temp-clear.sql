-- Clear all data from all tables in the correct order
DELETE FROM mentions;
DELETE FROM notifications;
DELETE FROM bookmarks;
DELETE FROM likes;
DELETE FROM comments;
DELETE FROM follows;
DELETE FROM posts;
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
SELECT 'mentions', COUNT(*) FROM mentions;
