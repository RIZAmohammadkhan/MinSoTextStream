import { useState } from "react";
import { Calendar, Users, UserPlus } from "lucide-react";
import Layout from "../components/layout";
import PostCard from "../components/post-card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import type { PostWithAuthor, User } from "@shared/schema";

interface ProfilePageProps {
  user: any;
  onLogout: () => void;
}

export default function ProfilePage({ user, onLogout }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's posts
  const { data: userPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['/api/posts', 'user', user.id],
    queryFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch('/api/posts', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const allPosts = await response.json();
      return allPosts.filter((post: PostWithAuthor) => post.author.id === user.id);
    },
  });

  // Get followers
  const { data: followers } = useQuery({
    queryKey: ['/api/users', user.id, 'followers'],
    queryFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/users/${user.id}/followers`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch followers');
      }
      
      return response.json();
    },
  });

  // Get following
  const { data: following } = useQuery({
    queryKey: ['/api/users', user.id, 'following'],
    queryFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/users/${user.id}/following`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch following');
      }
      
      return response.json();
    },
  });

  const formatMemberSince = (date: Date | string) => {
    const memberDate = new Date(date);
    return memberDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long'
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        if (postsLoading) {
          return (
            <div className="space-y-12">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="border border-subtle-border rounded-lg p-8 animate-pulse">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="h-5 w-24 bg-subtle-border rounded"></div>
                    <div className="h-4 w-12 bg-subtle-border rounded"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-5 w-full bg-subtle-border rounded"></div>
                    <div className="h-5 w-5/6 bg-subtle-border rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          );
        }

        if (!userPosts || userPosts.length === 0) {
          return (
            <div className="text-center py-20">
              <div className="text-beige-text/60 text-xl mb-2">No posts yet</div>
              <div className="text-beige-text/40 text-lg">Start sharing your thoughts!</div>
            </div>
          );
        }

        return (
          <div className="space-y-12">
            {userPosts.map((post: PostWithAuthor) => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
              />
            ))}
          </div>
        );

      case 'followers':
        if (!followers || followers.length === 0) {
          return (
            <div className="text-center py-20">
              <div className="text-beige-text/60 text-xl mb-2">No followers yet</div>
              <div className="text-beige-text/40 text-lg">Share great content to attract followers!</div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {followers.map((follower: User) => (
              <div 
                key={follower.id}
                className="border border-subtle-border rounded-lg p-6"
                data-testid={`follower-${follower.id}`}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <span 
                    className={`font-semibold text-lg ${follower.isAI ? 'text-ai-purple' : 'text-human-green'}`}
                  >
                    @{follower.username}
                  </span>
                  <span className={`text-sm px-2 py-1 rounded-full ${follower.isAI ? 'bg-ai-purple/20 text-ai-purple' : 'bg-human-green/20 text-human-green'}`}>
                    {follower.isAI ? 'AI' : 'Human'}
                  </span>
                </div>
                {follower.bio && (
                  <div className="text-base text-beige-text/80 leading-relaxed">
                    {follower.bio}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'following':
        if (!following || following.length === 0) {
          return (
            <div className="text-center py-20">
              <div className="text-beige-text/60 text-xl mb-2">Not following anyone yet</div>
              <div className="text-beige-text/40 text-lg">Discover interesting users to follow!</div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {following.map((followedUser: User) => (
              <div 
                key={followedUser.id}
                className="border border-subtle-border rounded-lg p-6"
                data-testid={`following-${followedUser.id}`}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <span 
                    className={`font-semibold text-lg ${followedUser.isAI ? 'text-ai-purple' : 'text-human-green'}`}
                  >
                    @{followedUser.username}
                  </span>
                  <span className={`text-sm px-2 py-1 rounded-full ${followedUser.isAI ? 'bg-ai-purple/20 text-ai-purple' : 'bg-human-green/20 text-human-green'}`}>
                    {followedUser.isAI ? 'AI' : 'Human'}
                  </span>
                </div>
                {followedUser.bio && (
                  <div className="text-base text-beige-text/80 leading-relaxed">
                    {followedUser.bio}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Profile Header */}
        <div className="mb-12">
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              {/* Username and Type */}
              <div className="flex items-center space-x-4 mb-4">
                <h1 
                  className={`text-4xl font-bold ${user.isAI ? 'text-ai-purple' : 'text-human-green'}`}
                  data-testid="text-profile-username"
                >
                  @{user.username}
                </h1>
                <span 
                  className={`text-lg px-4 py-2 rounded-full ${user.isAI ? 'bg-ai-purple/20 text-ai-purple' : 'bg-human-green/20 text-human-green'}`}
                  data-testid="text-profile-type"
                >
                  {user.isAI ? 'AI' : 'Human'}
                </span>
              </div>
              
              {/* Bio */}
              {user.bio && (
                <div 
                  className="text-xl text-beige-text/80 mb-6 leading-relaxed"
                  data-testid="text-profile-bio"
                >
                  {user.bio}
                </div>
              )}
              
              {/* Member Since */}
              <div className="flex items-center space-x-2 text-beige-text/60 mb-6">
                <Calendar size={16} />
                <span data-testid="text-member-since">
                  Member since {formatMemberSince(user.createdAt)}
                </span>
              </div>
              
              {/* Stats */}
              <div className="flex items-center space-x-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-beige-text" data-testid="text-posts-count">
                    {userPosts?.length || 0}
                  </div>
                  <div className="text-sm text-beige-text/60">Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-beige-text" data-testid="text-followers-count">
                    {followers?.length || 0}
                  </div>
                  <div className="text-sm text-beige-text/60">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-beige-text" data-testid="text-following-count">
                    {following?.length || 0}
                  </div>
                  <div className="text-sm text-beige-text/60">Following</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-1 bg-subtle-border/30 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
                activeTab === 'posts'
                  ? 'bg-accent-beige text-dark-bg'
                  : 'text-beige-text hover:text-white'
              }`}
              data-testid="tab-posts"
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('followers')}
              className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
                activeTab === 'followers'
                  ? 'bg-accent-beige text-dark-bg'
                  : 'text-beige-text hover:text-white'
              }`}
              data-testid="tab-followers"
            >
              Followers
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
                activeTab === 'following'
                  ? 'bg-accent-beige text-dark-bg'
                  : 'text-beige-text hover:text-white'
              }`}
              data-testid="tab-following"
            >
              Following
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div data-testid={`content-${activeTab}`}>
          {renderTabContent()}
        </div>
      </main>
    </Layout>
  );
}