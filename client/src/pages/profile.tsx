import { useState } from "react";
import { Calendar, Users, UserPlus, Settings, Send } from "lucide-react";
import Layout from "../components/layout";
import PostCard from "../components/post-card";
import SettingsDialog from "../components/settings-dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@/lib/notifications";
import { apiRequest } from "../lib/queryClient";
import { useLocation } from "wouter";
import type { PostWithAuthor, User } from "@shared/schema";

interface ProfilePageProps {
  user: any;
  onLogout: () => void;
  userId?: string;
}

export default function ProfilePage({ user, onLogout, userId }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');
    const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Determine which user profile to show
  const profileUserId = userId || user.id;
  const isOwnProfile = profileUserId === user.id;

  // Get profile user data
  const { data: profileUser, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/users', profileUserId],
    queryFn: async () => {
      if (isOwnProfile) {
        return user; // Use current user data for own profile
      }
      
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/users/${profileUserId}`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      return response.json();
    },
    enabled: !!profileUserId,
  });

  // Get user's posts
  const { data: userPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['/api/users', profileUserId, 'posts'],
    queryFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/users/${profileUserId}/posts?limit=50`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      return response.json();
    },
    enabled: !!profileUserId,
  });

  // Get followers
  const { data: followers } = useQuery({
    queryKey: ['/api/users', profileUserId, 'followers'],
    queryFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/users/${profileUserId}/followers`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch followers');
      }
      
      return response.json();
    },
    enabled: !!profileUserId,
  });

  // Get following
  const { data: following } = useQuery({
    queryKey: ['/api/users', profileUserId, 'following'],
    queryFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/users/${profileUserId}/following`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch following');
      }
      
      return response.json();
    },
    enabled: !!profileUserId,
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/users/${profileUserId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle follow');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', profileUserId, 'followers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', user.id, 'following'] });
      notifications.success("Success", profileUser?.isFollowing ? "Unfollowed user" : "Now following user");
    },
    onError: (error: any) => {
      notifications.error("Error", error.message || "Failed to toggle follow");
    },
  });

  const formatMemberSince = (date: Date | string) => {
    const memberDate = new Date(date);
    return memberDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long'
    });
  };

  const handleDM = async () => {
    // Don't allow DM to self
    if (profileUserId === user?.id) {
      notifications.error("Error", "You can't message yourself!");
      return;
    }

    try {
      // Try to find existing conversation with this user
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch('/api/dm/conversations', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });

      if (response.ok) {
        const conversations = await response.json();
        const existingConversation = conversations.find((conv: any) => 
          conv.participant.id === profileUserId
        );

        if (existingConversation) {
          // Navigate to existing conversation
          navigate(`/messages?conversation=${existingConversation.id}`);
        } else {
          // Navigate to messages with the user ID to start new conversation
          navigate(`/messages?user=${profileUserId}`);
        }
      } else {
        // If we can't fetch conversations, just navigate to messages
        navigate(`/messages?user=${profileUserId}`);
      }
    } catch (error) {
      console.error('Error handling DM:', error);
      // Fallback: just navigate to messages
      navigate('/messages');
    }
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span 
                      className={`font-semibold text-lg ${follower.isAI ? 'text-ai-purple' : 'text-human-green'} cursor-pointer hover:underline`}
                      onClick={() => navigate(`/profile/${follower.id}`)}
                    >
                      @{follower.username}
                    </span>
                    <span className={`text-sm px-2 py-1 rounded-full ${follower.isAI ? 'bg-ai-purple/20 text-ai-purple' : 'bg-human-green/20 text-human-green'}`}>
                      {follower.isAI ? 'AI' : 'Human'}
                    </span>
                  </div>
                  {follower.id !== user.id && (
                    <Button
                      onClick={() => navigate(`/messages?user=${follower.id}`)}
                      size="sm"
                      className="bg-accent-beige text-dark-bg hover:bg-accent-beige/90"
                      title={`Message @${follower.username}`}
                    >
                      <Send size={14} className="mr-1" />
                      DM
                    </Button>
                  )}
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span 
                      className={`font-semibold text-lg ${followedUser.isAI ? 'text-ai-purple' : 'text-human-green'} cursor-pointer hover:underline`}
                      onClick={() => navigate(`/profile/${followedUser.id}`)}
                    >
                      @{followedUser.username}
                    </span>
                    <span className={`text-sm px-2 py-1 rounded-full ${followedUser.isAI ? 'bg-ai-purple/20 text-ai-purple' : 'bg-human-green/20 text-human-green'}`}>
                      {followedUser.isAI ? 'AI' : 'Human'}
                    </span>
                  </div>
                  {followedUser.id !== user.id && (
                    <Button
                      onClick={() => navigate(`/messages?user=${followedUser.id}`)}
                      size="sm"
                      className="bg-accent-beige text-dark-bg hover:bg-accent-beige/90"
                      title={`Message @${followedUser.username}`}
                    >
                      <Send size={14} className="mr-1" />
                      DM
                    </Button>
                  )}
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

  if (profileLoading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="animate-pulse">
            <div className="flex items-start justify-between mb-8">
              <div className="flex-1">
                <div className="h-10 w-64 bg-subtle-border rounded mb-4"></div>
                <div className="h-6 w-96 bg-subtle-border rounded mb-6"></div>
                <div className="h-4 w-48 bg-subtle-border rounded mb-6"></div>
                <div className="flex space-x-8">
                  <div className="h-8 w-16 bg-subtle-border rounded"></div>
                  <div className="h-8 w-16 bg-subtle-border rounded"></div>
                  <div className="h-8 w-16 bg-subtle-border rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  if (!profileUser) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="text-center py-20">
            <div className="text-red-400 text-2xl mb-4">User not found</div>
            <div className="text-beige-text/50 text-lg">The user you're looking for doesn't exist</div>
          </div>
        </main>
      </Layout>
    );
  }

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
                  className={`text-4xl font-bold ${profileUser.isAI ? 'text-ai-purple' : 'text-human-green'}`}
                  data-testid="text-profile-username"
                >
                  @{profileUser.username}
                </h1>
                <span 
                  className={`text-lg px-4 py-2 rounded-full ${profileUser.isAI ? 'bg-ai-purple/20 text-ai-purple' : 'bg-human-green/20 text-human-green'}`}
                  data-testid="text-profile-type"
                >
                  {profileUser.isAI ? 'AI' : 'Human'}
                </span>
              </div>
              
              {/* Bio */}
              {profileUser.bio && (
                <div 
                  className="text-xl text-beige-text/80 mb-6 leading-relaxed"
                  data-testid="text-profile-bio"
                >
                  {profileUser.bio}
                </div>
              )}
              
              {/* Member Since */}
              <div className="flex items-center space-x-2 text-beige-text/60 mb-6">
                <Calendar size={16} />
                <span data-testid="text-member-since">
                  Member since {formatMemberSince(profileUser.createdAt)}
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
                    {profileUser.followerCount || followers?.length || 0}
                  </div>
                  <div className="text-sm text-beige-text/60">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-beige-text" data-testid="text-following-count">
                    {profileUser.followingCount || following?.length || 0}
                  </div>
                  <div className="text-sm text-beige-text/60">Following</div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              {!isOwnProfile && (
                <>
                  <Button
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}
                    className={
                      profileUser.isFollowing
                        ? "bg-subtle-border text-beige-text hover:bg-red-600 hover:text-white"
                        : "bg-accent-beige text-dark-bg hover:bg-accent-beige/90"
                    }
                    data-testid="button-follow"
                  >
                    <UserPlus size={16} className="mr-2" />
                    {followMutation.isPending 
                      ? 'Loading...' 
                      : profileUser.isFollowing 
                      ? 'Unfollow' 
                      : 'Follow'
                    }
                  </Button>
                  <Button
                    onClick={handleDM}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    data-testid="button-dm"
                  >
                    <Send size={16} className="mr-2" />
                    Message
                  </Button>
                </>
              )}
              
              {isOwnProfile && (
                <SettingsDialog user={user} onLogout={onLogout}>
                  <Button
                    className="bg-accent-beige text-dark-bg px-8 py-3 rounded-full font-medium text-base hover:bg-accent-beige/90 transition-colors duration-200"
                    data-testid="button-settings"
                  >
                    <Settings size={16} className="mr-2" />
                    Settings
                  </Button>
                </SettingsDialog>
              )}
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