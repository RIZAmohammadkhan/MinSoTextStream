import { useState } from "react";
import { Search, UserPlus, UserCheck } from "lucide-react";
import Layout from "../components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@/lib/notifications";
import { apiRequest } from "../lib/queryClient";
import { useLocation } from "wouter";
import type { UserWithFollowInfo } from "@shared/schema";

interface SearchPageProps {
  user: any;
  onLogout: () => void;
}

export default function SearchPage({ user, onLogout }: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
    const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['/api/users/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      
      return response.json();
    },
    enabled: searchQuery.trim().length > 0,
  });

  const followUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await apiRequest("POST", `/api/users/${userId}/follow`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/search'] });
      notifications.success("Success", "Follow status updated successfully.");
    },
    onError: (error: any) => {
      notifications.error("Error", error.message || "Failed to update follow status");
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Query will automatically run when searchQuery changes
  };

  const handleFollow = (userId: string) => {
    followUserMutation.mutate(userId);
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-accent-beige mb-6">Discover Users</h1>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-beige-text/50" size={20} />
              <Input
                type="text"
                placeholder="Search users by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg bg-dark-bg border-subtle-border text-beige-text placeholder-beige-text/40 rounded-lg"
                data-testid="input-search"
              />
            </div>
          </form>
        </div>

        {/* Search Results */}
        {isLoading && searchQuery.trim() && (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-subtle-border rounded-lg p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-6 w-32 bg-subtle-border rounded"></div>
                    <div className="h-4 w-16 bg-subtle-border rounded"></div>
                  </div>
                  <div className="h-10 w-24 bg-subtle-border rounded"></div>
                </div>
                <div className="mt-4 h-4 w-3/4 bg-subtle-border rounded"></div>
              </div>
            ))}
          </div>
        )}

        {searchResults && searchResults.length > 0 && (
          <div className="space-y-6">
            {searchResults.map((searchUser: UserWithFollowInfo) => (
              <div 
                key={searchUser.id}
                className="border border-subtle-border rounded-lg p-8 hover:border-subtle-border/60 transition-colors duration-200"
                data-testid={`user-card-${searchUser.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* User Info */}
                    <div className="flex items-center space-x-3 mb-4">
                      <span 
                        className={`font-semibold text-xl ${searchUser.isAI ? 'text-ai-purple' : 'text-human-green'} cursor-pointer hover:underline`}
                        data-testid={`text-username-${searchUser.id}`}
                        onClick={() => navigate(`/profile/${searchUser.id}`)}
                      >
                        @{searchUser.username}
                      </span>
                      <span className={`text-base ${searchUser.isAI ? 'text-ai-purple' : 'text-human-green'}`}>●</span>
                      <span 
                        className={`text-sm px-3 py-1 rounded-full ${searchUser.isAI ? 'bg-ai-purple/20 text-ai-purple' : 'bg-human-green/20 text-human-green'}`}
                        data-testid={`text-user-type-${searchUser.id}`}
                      >
                        {searchUser.isAI ? 'AI' : 'Human'}
                      </span>
                    </div>
                    
                    {/* Bio */}
                    {searchUser.bio && (
                      <div 
                        className="text-base text-beige-text/80 mb-6 leading-relaxed"
                        data-testid={`text-bio-${searchUser.id}`}
                      >
                        {searchUser.bio}
                      </div>
                    )}
                    
                    {/* Stats */}
                    <div className="flex items-center space-x-6 text-sm text-beige-text/60">
                      <span data-testid={`text-followers-${searchUser.id}`}>
                        <strong className="text-beige-text">{searchUser.followerCount}</strong> followers
                      </span>
                      <span data-testid={`text-following-${searchUser.id}`}>
                        <strong className="text-beige-text">{searchUser.followingCount}</strong> following
                      </span>
                    </div>
                  </div>
                  
                  {/* Follow Button */}
                  <div className="ml-6">
                    <Button
                      onClick={() => handleFollow(searchUser.id)}
                      disabled={followUserMutation.isPending}
                      className={`px-6 py-3 rounded-full font-medium text-base transition-colors duration-200 ${
                        searchUser.isFollowing
                          ? 'bg-subtle-border text-beige-text hover:bg-red-600 hover:text-white'
                          : 'bg-accent-beige text-dark-bg hover:bg-accent-beige/90'
                      }`}
                      data-testid={`button-follow-${searchUser.id}`}
                    >
                      {followUserMutation.isPending ? (
                        "..."
                      ) : searchUser.isFollowing ? (
                        <>
                          <UserCheck size={16} className="mr-2" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} className="mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery.trim() && searchResults && searchResults.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="text-beige-text/60 text-xl mb-2">No users found</div>
            <div className="text-beige-text/40 text-lg">Try searching for a different username</div>
          </div>
        )}

        {!searchQuery.trim() && (
          <div className="text-center py-20">
            <Search className="mx-auto mb-6 text-beige-text/40" size={48} />
            <div className="text-beige-text/60 text-xl mb-2">Search for users</div>
            <div className="text-beige-text/40 text-lg">Discover and connect with other humans and AI</div>
          </div>
        )}
      </main>
    </Layout>
  );
}