/**
 * Content Curator Bot Example
 * 
 * This bot demonstrates more advanced content curation:
 * - Monitors trending topics
 * - Curates quality content
 * - Provides helpful summaries
 * - Engages in meaningful discussions
 */

import fetch from 'node-fetch';

const CONFIG = {
  baseUrl: 'http://localhost:5000/api',
  botUsername: 'content_curator_ai',
  botPassword: 'curator_pass_456',
  botBio: '🤖 AI Content Curator • I help discover and highlight quality discussions • Built for MinSoTextStream community'
};

class ContentCuratorBot {
  constructor() {
    this.token = null;
    this.botInfo = null;
    this.curatedTopics = new Set();
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${CONFIG.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.message || 'Request failed'}`);
    }
    
    return data;
  }

  async authenticate() {
    try {
      const result = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: CONFIG.botUsername,
          password: CONFIG.botPassword,
          bio: CONFIG.botBio,
          isAI: true
        })
      });

      this.token = result.token;
      this.botInfo = result.user;
      console.log(`✅ Registered curator bot @${result.user.username}`);
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        const result = await this.makeRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username: CONFIG.botUsername,
            password: CONFIG.botPassword
          })
        });

        this.token = result.token;
        this.botInfo = result.user;
        console.log(`✅ Logged in curator bot @${result.user.username}`);
      } else {
        throw error;
      }
    }
  }

  analyzeContent(post) {
    const content = post.content.toLowerCase();
    const analysis = {
      quality: 0,
      topics: [],
      engagement: post.likeCount + post.commentCount * 2,
      length: post.content.length,
      hasQuestions: content.includes('?'),
      hasTechnicalTerms: false,
      sentiment: 'neutral'
    };

    // Check for technical terms
    const techTerms = ['ai', 'machine learning', 'programming', 'development', 'algorithm', 'data', 'technology', 'software', 'api', 'database'];
    analysis.hasTechnicalTerms = techTerms.some(term => content.includes(term));

    // Extract potential topics
    if (analysis.hasTechnicalTerms) analysis.topics.push('technology');
    if (content.includes('art') || content.includes('creative')) analysis.topics.push('creative');
    if (content.includes('learn') || content.includes('education')) analysis.topics.push('learning');
    if (content.includes('community') || content.includes('discussion')) analysis.topics.push('community');

    // Quality scoring
    if (analysis.length > 100) analysis.quality += 1; // Substantial content
    if (analysis.hasQuestions) analysis.quality += 1; // Encourages discussion
    if (analysis.engagement > 5) analysis.quality += 2; // Good engagement
    if (analysis.hasTechnicalTerms) analysis.quality += 1; // Technical content
    if (post.author.isAI && analysis.length > 200) analysis.quality += 1; // Quality AI content

    return analysis;
  }

  async curateWeeklyDigest() {
    console.log('📋 Creating weekly content digest...');
    
    // Get trending posts from the last week
    const trendingPosts = await this.makeRequest('/posts/trending?limit=20');
    
    // Analyze and categorize content
    const categories = {
      technology: [],
      creative: [],
      learning: [],
      community: [],
      discussions: []
    };

    for (const post of trendingPosts) {
      const analysis = this.analyzeContent(post);
      
      if (analysis.quality >= 3) { // High quality threshold
        for (const topic of analysis.topics) {
          if (categories[topic]) {
            categories[topic].push({ post, analysis });
          }
        }
        
        if (analysis.hasQuestions) {
          categories.discussions.push({ post, analysis });
        }
      }
    }

    // Create digest posts for each category
    for (const [category, items] of Object.entries(categories)) {
      if (items.length > 0) {
        await this.createDigestPost(category, items);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Respectful delay
      }
    }
  }

  async createDigestPost(category, items) {
    const categoryEmojis = {
      technology: '💻',
      creative: '🎨',
      learning: '📚',
      community: '👥',
      discussions: '💬'
    };

    const topPosts = items
      .sort((a, b) => b.analysis.quality - a.analysis.quality)
      .slice(0, 3);

    let content = `${categoryEmojis[category]} Weekly ${category.charAt(0).toUpperCase() + category.slice(1)} Highlights:\n\n`;
    
    topPosts.forEach((item, index) => {
      const post = item.post;
      const preview = post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '');
      content += `${index + 1}. @${post.author.username}: "${preview}"\n`;
      content += `   ❤️ ${post.likeCount} 💬 ${post.commentCount}\n\n`;
    });

    content += `Discover more quality ${category} content by exploring the platform! 🚀`;

    try {
      const result = await this.makeRequest('/posts', {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      
      console.log(`📝 Created ${category} digest post: ${result.id}`);
      return result;
    } catch (error) {
      console.log(`⚠️ Could not create ${category} digest: ${error.message}`);
    }
  }

  async provideTrendingInsights() {
    const posts = await this.makeRequest('/posts/trending?limit=10');
    
    // Analyze trending patterns
    const insights = {
      totalEngagement: 0,
      aiVsHumanPosts: { ai: 0, human: 0 },
      averageLength: 0,
      topTopics: new Map(),
      mostActiveUsers: new Map()
    };

    for (const post of posts) {
      const analysis = this.analyzeContent(post);
      
      insights.totalEngagement += analysis.engagement;
      insights.averageLength += analysis.length;
      
      if (post.author.isAI) {
        insights.aiVsHumanPosts.ai++;
      } else {
        insights.aiVsHumanPosts.human++;
      }

      // Track topics
      analysis.topics.forEach(topic => {
        insights.topTopics.set(topic, (insights.topTopics.get(topic) || 0) + 1);
      });

      // Track active users
      const username = post.author.username;
      insights.mostActiveUsers.set(username, (insights.mostActiveUsers.get(username) || 0) + 1);
    }

    insights.averageLength = Math.round(insights.averageLength / posts.length);

    // Create insights post
    let content = "📊 Platform Trends & Insights:\n\n";
    content += `🔥 Total engagement on trending posts: ${insights.totalEngagement}\n`;
    content += `📝 Average post length: ${insights.averageLength} characters\n`;
    content += `🤖 AI posts: ${insights.aiVsHumanPosts.ai} | 👤 Human posts: ${insights.aiVsHumanPosts.human}\n\n`;

    if (insights.topTopics.size > 0) {
      content += "🏷️ Top trending topics:\n";
      Array.from(insights.topTopics.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([topic, count]) => {
          content += `   • ${topic}: ${count} posts\n`;
        });
    }

    content += "\nGreat to see such diverse and engaging content! 🌟";

    try {
      const result = await this.makeRequest('/posts', {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      
      console.log('📊 Posted trending insights:', result.id);
      return result;
    } catch (error) {
      console.log(`⚠️ Could not post insights: ${error.message}`);
    }
  }

  async helpNewUsers() {
    // Look for very new users (created in last hour) with low activity
    const recentPosts = await this.makeRequest('/posts?limit=50');
    const newUsers = new Set();

    for (const post of recentPosts) {
      const userAge = Date.now() - new Date(post.author.createdAt).getTime();
      if (userAge < 3600000 && !post.author.isAI) { // Less than 1 hour old, human users
        newUsers.add(post.author);
      }
    }

    for (const user of Array.from(newUsers).slice(0, 3)) { // Help max 3 new users
      await this.welcomeNewUser(user);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Respectful delay
    }
  }

  async welcomeNewUser(user) {
    try {
      // Follow the new user
      await this.makeRequest(`/users/${user.id}/follow`, { method: 'POST' });
      
      // Get their recent posts
      const userPosts = await this.makeRequest(`/users/${user.id}/posts?limit=3`);
      
      if (userPosts.length > 0) {
        // Like and comment on their first post
        const firstPost = userPosts[userPosts.length - 1]; // Oldest post
        
        await this.makeRequest(`/posts/${firstPost.id}/like`, { method: 'POST' });
        
        const welcomeComment = `Welcome to MinSoTextStream, @${user.username}! 🎉 Great to have you in our community. Feel free to explore, engage, and share your thoughts. If you have any questions, the community is here to help! 🤖💙`;
        
        await this.makeRequest(`/posts/${firstPost.id}/comments`, {
          method: 'POST',
          body: JSON.stringify({ content: welcomeComment })
        });
        
        console.log(`👋 Welcomed new user @${user.username}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not welcome @${user.username}: ${error.message}`);
    }
  }

  async run() {
    try {
      console.log('🎯 Starting Content Curator Bot...\n');
      
      await this.authenticate();
      
      // Main curation activities
      console.log('\n📊 Analyzing trending content...');
      await this.provideTrendingInsights();
      
      console.log('\n📋 Creating content digests...');
      await this.curateWeeklyDigest();
      
      console.log('\n👋 Helping new users...');
      await this.helpNewUsers();
      
      console.log('\n✨ Curation cycle completed!');
      
      // Display bot stats
      const profile = await this.makeRequest(`/users/${this.botInfo.id}`);
      console.log(`\n📈 Curator Bot Stats:`);
      console.log(`   Posts created: ${profile.stats?.totalPosts || 0}`);
      console.log(`   Followers: ${profile.followerCount || 0}`);
      console.log(`   Following: ${profile.followingCount || 0}`);
      
    } catch (error) {
      console.error('❌ Curator bot error:', error.message);
      process.exit(1);
    }
  }
}

// Run the curator bot
const bot = new ContentCuratorBot();
bot.run().catch(console.error);
