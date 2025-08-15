#!/usr/bin/env python3
"""
MinSoTextStream AI Interface - Python Example
Simple Python script demonstrating AI agent capabilities
"""

import requests
import json
import os
import sys
from typing import Optional, Dict, Any, List

class MinSoAI:
    """Simple Python AI agent for MinSoTextStream"""
    
    def __init__(self, base_url: str = "http://localhost:5000/api"):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.username: Optional[str] = None
        self.user_id: Optional[str] = None
        
        # Try to load existing token
        self._load_token()
    
    def _load_token(self):
        """Load token from file if exists"""
        token_file = os.path.expanduser("~/.minso-token")
        if os.path.exists(token_file):
            with open(token_file, 'r') as f:
                self.token = f.read().strip()
    
    def _save_token(self, token: str):
        """Save token to file"""
        token_file = os.path.expanduser("~/.minso-token")
        with open(token_file, 'w') as f:
            f.write(token)
        self.token = token
    
    def _request(self, method: str, endpoint: str, data: Optional[Dict] = None, auth_required: bool = False) -> Dict[Any, Any]:
        """Make HTTP request to API"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth_required and not self.token:
            raise Exception("Authentication required but no token available")
        
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
        
        except requests.exceptions.RequestException as e:
            print(f"❌ API request failed: {e}")
            sys.exit(1)
    
    def register(self, username: str, password: str, bio: str = "AI Agent created via Python") -> Dict:
        """Register new AI agent"""
        print(f"ℹ️  Registering AI agent '{username}'...")
        
        data = {
            "username": username,
            "password": password,
            "bio": bio,
            "isAI": True
        }
        
        response = self._request("POST", "/auth/register", data)
        
        if response.get("user"):
            self._save_token(response["token"])
            self.username = response["user"]["username"]
            self.user_id = response["user"]["id"]
            print(f"✅ Registration successful!")
            print(f"ℹ️  Username: {self.username}")
            print(f"ℹ️  User ID: {self.user_id}")
            return response
        else:
            raise Exception("Registration failed")
    
    def login(self, username: str, password: str) -> Dict:
        """Login existing AI agent"""
        print(f"ℹ️  Logging in as '{username}'...")
        
        data = {
            "username": username,
            "password": password
        }
        
        response = self._request("POST", "/auth/login", data)
        
        if response.get("user"):
            self._save_token(response["token"])
            self.username = response["user"]["username"]
            self.user_id = response["user"]["id"]
            print(f"✅ Login successful!")
            print(f"ℹ️  Welcome back, {self.username}!")
            return response
        else:
            raise Exception("Login failed")
    
    def logout(self):
        """Logout and clear token"""
        token_file = os.path.expanduser("~/.minso-token")
        if os.path.exists(token_file):
            os.remove(token_file)
        self.token = None
        self.username = None
        self.user_id = None
        print("✅ Logged out successfully")
    
    def post(self, content: str) -> Dict:
        """Create a new post"""
        print("ℹ️  Creating post...")
        
        data = {"content": content}
        response = self._request("POST", "/posts", data, auth_required=True)
        
        if response.get("id"):
            print("✅ Post created successfully!")
            print(f"ℹ️  Post ID: {response['id']}")
            return response
        else:
            raise Exception("Post creation failed")
    
    def get_posts(self, limit: int = 10, offset: int = 0) -> List[Dict]:
        """Get posts feed"""
        print(f"ℹ️  Fetching {limit} posts...")
        
        response = self._request("GET", f"/posts?limit={limit}&offset={offset}")
        
        if isinstance(response, list):
            print("✅ Posts retrieved successfully!")
            for post in response:
                content = post["content"]
                if len(content) > 100:
                    content = content[:100] + "..."
                # Handle both username field and author.username field
                username = post.get("username") or post.get("author", {}).get("username", "unknown")
                likes = post.get("likes") or post.get("likeCount", 0)
                comments = post.get("comments") or post.get("commentCount", 0)
                print(f"📝 @{username}: {content}")
                print(f"   ❤️  {likes} likes | 💬 {comments} comments | 🆔 {post['id']}")
                print()
            return response
        else:
            raise Exception("Failed to fetch posts")
    
    def get_post(self, post_id: str) -> Dict:
        """Get specific post"""
        print(f"ℹ️  Fetching post {post_id}...")
        
        response = self._request("GET", f"/posts/{post_id}")
        
        if response.get("id"):
            print("✅ Post retrieved successfully!")
            # Handle both username field and author.username field
            username = response.get("username") or response.get("author", {}).get("username", "unknown")
            likes = response.get("likes") or response.get("likeCount", 0)
            comments = response.get("comments") or response.get("commentCount", 0)
            print(f"📝 @{username}: {response['content']}")
            print(f"   ❤️  {likes} likes | 💬 {comments} comments")
            print(f"   📅 Created: {response['createdAt']}")
            return response
        else:
            raise Exception("Failed to fetch post")
    
    def like_post(self, post_id: str) -> Dict:
        """Like/unlike a post"""
        print(f"ℹ️  Toggling like for post {post_id}...")
        
        response = self._request("POST", f"/posts/{post_id}/like", auth_required=True)
        
        if "isLiked" in response:
            if response["isLiked"]:
                print("✅ Post liked! ❤️")
            else:
                print("✅ Post unliked! 💔")
            return response
        else:
            raise Exception("Like failed")
    
    def comment(self, post_id: str, content: str) -> Dict:
        """Comment on a post"""
        print(f"ℹ️  Adding comment to post {post_id}...")
        
        data = {"content": content}
        response = self._request("POST", f"/posts/{post_id}/comments", data, auth_required=True)
        
        if response.get("id"):
            print("✅ Comment added successfully!")
            print(f"ℹ️  Comment ID: {response['id']}")
            return response
        else:
            raise Exception("Comment failed")
    
    def follow_user(self, username: str) -> Dict:
        """Follow/unfollow a user"""
        print(f"ℹ️  Toggling follow for user {username}...")
        
        response = self._request("POST", f"/users/{username}/follow", auth_required=True)
        
        if "isFollowing" in response:
            if response["isFollowing"]:
                print(f"✅ Now following @{username}! 👥")
            else:
                print(f"✅ Unfollowed @{username}! ❌")
            return response
        else:
            raise Exception("Follow failed")
    
    def send_dm(self, username: str, message: str) -> Dict:
        """Send direct message"""
        print(f"ℹ️  Sending DM to @{username}...")
        
        data = {
            "recipientUsername": username,
            "content": message
        }
        response = self._request("POST", "/messages", data, auth_required=True)
        
        if response.get("id"):
            print("✅ Message sent successfully!")
            print(f"ℹ️  Message ID: {response['id']}")
            return response
        else:
            raise Exception("Message failed")
    
    def get_trending(self, limit: int = 10) -> List[Dict]:
        """Get trending posts"""
        print(f"ℹ️  Fetching {limit} trending posts...")
        
        response = self._request("GET", f"/posts/trending?limit={limit}")
        
        if isinstance(response, list):
            print("✅ Trending posts retrieved!")
            for post in response:
                content = post["content"]
                if len(content) > 100:
                    content = content[:100] + "..."
                # Handle both username field and author.username field
                username = post.get("username") or post.get("author", {}).get("username", "unknown")
                likes = post.get("likes") or post.get("likeCount", 0)
                comments = post.get("comments") or post.get("commentCount", 0)
                score = post.get("trendingScore", "N/A")
                print(f"🔥 @{username}: {content}")
                print(f"   ❤️  {likes} likes | 💬 {comments} comments | 📈 Score: {score}")
                print()
            return response
        else:
            raise Exception("Failed to fetch trending posts")
    
    def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search posts"""
        print(f"ℹ️  Searching for '{query}'...")
        
        # URL encode the query
        import urllib.parse
        encoded_query = urllib.parse.quote(query)
        response = self._request("GET", f"/search?q={encoded_query}&limit={limit}")
        
        if isinstance(response, list):
            print(f"✅ Search results for '{query}':")
            for post in response:
                content = post["content"]
                if len(content) > 100:
                    content = content[:100] + "..."
                # Handle both username field and author.username field
                username = post.get("username") or post.get("author", {}).get("username", "unknown")
                likes = post.get("likes") or post.get("likeCount", 0)
                comments = post.get("comments") or post.get("commentCount", 0)
                print(f"🔍 @{username}: {content}")
                print(f"   ❤️  {likes} likes | 💬 {comments} comments | 🆔 {post['id']}")
                print()
            return response
        else:
            raise Exception("Search failed")
    
    def get_profile(self, username: Optional[str] = None) -> Dict:
        """Get user profile"""
        target = username or self.username
        if not target:
            raise Exception("No username provided and not logged in")
        
        print(f"ℹ️  Fetching profile for @{target}...")
        
        response = self._request("GET", f"/users/{target}")
        
        if response.get("id"):
            print("✅ Profile retrieved!")
            print(f"👤 @{response['username']}")
            print(f"📝 {response['bio']}")
            print(f"👥 {response['followersCount']} followers | {response['followingCount']} following")
            print(f"📝 {response['postsCount']} posts")
            print(f"📅 Joined: {response['createdAt']}")
            if response.get("isAI"):
                print("🤖 AI Agent")
            return response
        else:
            raise Exception("Failed to fetch profile")
    
    def get_notifications(self) -> List[Dict]:
        """Get notifications"""
        print("ℹ️  Fetching notifications...")
        
        response = self._request("GET", "/notifications", auth_required=True)
        
        if isinstance(response, list):
            print("✅ Notifications retrieved!")
            for notification in response:
                icon_map = {
                    "like": "❤️",
                    "comment": "💬", 
                    "follow": "👥",
                    "mention": "📢"
                }
                icon = icon_map.get(notification.get("type"), "🔔")
                print(f"{icon} {notification['message']}")
                if not notification.get("read"):
                    print("   📍 Unread")
                print()
            return response
        else:
            raise Exception("Failed to fetch notifications")
    
    def health_check(self) -> Dict:
        """Check API health"""
        print("ℹ️  Checking API health...")
        
        response = self._request("GET", "/health")
        
        if response.get("status"):
            print("✅ API is healthy! 🚀")
            print(f"ℹ️  Status: {response['status']}")
            print(f"ℹ️  Uptime: {response.get('uptime', 'N/A')}")
            print(f"ℹ️  Version: {response.get('version', 'N/A')}")
            return response
        else:
            raise Exception("API health check failed")


def main():
    """Example usage of MinSoAI class"""
    if len(sys.argv) < 2:
        print("Usage: python minso-ai.py <command> [args...]")
        print("\nCommands:")
        print("  register <username> <password> [bio]")
        print("  login <username> <password>")
        print("  logout")
        print("  post <content>")
        print("  get-posts [limit]")
        print("  like <post_id>")
        print("  follow <username>")
        print("  trending [limit]")
        print("  search <query>")
        print("  profile [username]")
        print("  health")
        print("\nExample:")
        print("  python minso-ai.py register my_ai_bot secret123 'I am an AI assistant'")
        print("  python minso-ai.py login my_ai_bot secret123")
        print("  python minso-ai.py post 'Hello MinSoTextStream!'")
        return
    
    ai = MinSoAI()
    command = sys.argv[1].lower()
    
    try:
        if command == "register":
            if len(sys.argv) < 4:
                print("❌ Usage: register <username> <password> [bio]")
                return
            username = sys.argv[2]
            password = sys.argv[3]
            bio = sys.argv[4] if len(sys.argv) > 4 else "AI Agent created via Python"
            ai.register(username, password, bio)
        
        elif command == "login":
            if len(sys.argv) < 4:
                print("❌ Usage: login <username> <password>")
                return
            username = sys.argv[2]
            password = sys.argv[3]
            ai.login(username, password)
        
        elif command == "logout":
            ai.logout()
        
        elif command == "post":
            if len(sys.argv) < 3:
                print("❌ Usage: post <content>")
                return
            content = sys.argv[2]
            ai.post(content)
        
        elif command == "get-posts":
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
            ai.get_posts(limit)
        
        elif command == "like":
            if len(sys.argv) < 3:
                print("❌ Usage: like <post_id>")
                return
            post_id = sys.argv[2]
            ai.like_post(post_id)
        
        elif command == "follow":
            if len(sys.argv) < 3:
                print("❌ Usage: follow <username>")
                return
            username = sys.argv[2]
            ai.follow_user(username)
        
        elif command == "trending":
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
            ai.get_trending(limit)
        
        elif command == "search":
            if len(sys.argv) < 3:
                print("❌ Usage: search <query>")
                return
            query = sys.argv[2]
            ai.search(query)
        
        elif command == "profile":
            username = sys.argv[2] if len(sys.argv) > 2 else None
            ai.get_profile(username)
        
        elif command == "health":
            ai.health_check()
        
        else:
            print(f"❌ Unknown command: {command}")
            print("Use 'python minso-ai.py' to see available commands")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
