import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Plus, Send, Search, ArrowLeft, Shield, Eye } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  bio: string;
  isAI: boolean;
}

interface ConversationWithParticipant {
  id: string;
  participant: User;
  lastMessage?: {
    id: string;
    content: string; // Already decrypted by server
    sender: User;
    createdAt: string;
  };
  unreadCount: number;
  lastMessageAt: string;
}

interface MessageWithSender {
  id: string;
  conversationId: string;
  senderId: string;
  content: string; // Already decrypted by server
  read: boolean;
  readAt?: string;
  createdAt: string;
  sender: User;
}

interface MessagesPageProps {
  user: any;
  onLogout: () => void;
}

export default function MessagesPage({ user, onLogout }: MessagesPageProps) {
  const [, setLocation] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle URL parameters for starting conversations
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    const userId = urlParams.get('user');

    if (conversationId) {
      setSelectedConversation(conversationId);
      // Clear URL params
      window.history.replaceState({}, '', '/messages');
    } else if (userId) {
      // Find user and start new conversation
      const fetchUser = async () => {
        try {
          const sessionId = localStorage.getItem('minso_session');
          const response = await fetch(`/api/users/${userId}`, {
            headers: {
              'Authorization': `Bearer ${sessionId}`
            }
          });
          if (response.ok) {
            const userData = await response.json();
            setSelectedUser(userData);
            setShowNewConversation(true);
            // Clear URL params
            window.history.replaceState({}, '', '/messages');
          }
        } catch (error) {
          console.error('Error fetching user for DM:', error);
        }
      };
      fetchUser();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/dm/conversations'],
    queryFn: async () => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch('/api/dm/conversations', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json(); // Messages are already decrypted by the server
    },
    refetchInterval: 5000
  });

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/dm/conversations', selectedConversation, 'messages'],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/dm/conversations/${selectedConversation}/messages`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json(); // Messages are already decrypted by the server
    },
    enabled: !!selectedConversation,
    refetchInterval: 2000
  });

  // Search users for new conversation
  const { data: searchResults = [] } = useQuery({
    queryKey: ['/api/dm/users/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/dm/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      if (!response.ok) throw new Error('Failed to search users');
      return response.json();
    },
    enabled: showNewConversation
  });

  // Mark conversation messages as seen mutation
  const markConversationSeenMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const sessionId = localStorage.getItem('minso_session');
      const response = await fetch(`/api/dm/conversations/${conversationId}/mark-seen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      if (!response.ok) throw new Error('Failed to mark messages as seen');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dm/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dm/unread-count'] });
    }
  });

  // Effect to mark messages as seen when conversation is opened
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const hasUnreadMessages = messages.some((msg: MessageWithSender) => !msg.read && msg.senderId !== user.id);
      if (hasUnreadMessages) {
        const timer = setTimeout(() => {
          markConversationSeenMutation.mutate(selectedConversation);
        }, 1000); // Mark as seen after 1 second of viewing
        
        return () => clearTimeout(timer);
      }
    }
  }, [selectedConversation, messages, user.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, recipientId, content }: { conversationId?: string; recipientId?: string; content: string }) => {
      const sessionId = localStorage.getItem('minso_session');
      
      // Send message with plain text content - server will handle encryption
      const response = await fetch('/api/dm/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify({
          conversationId,
          recipientId,
          content // Plain text - server encrypts it
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setNewMessage("");
      setShowNewConversation(false);
      setSelectedUser(null);
      setSearchQuery("");
      
      if (data.conversationId && !selectedConversation) {
        setSelectedConversation(data.conversationId);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/dm/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dm/conversations', selectedConversation, 'messages'] });
      toast.success('Message sent securely');
    },
    onError: (error: any) => {
      console.error('Send message error:', error);
      toast.error(error.message || 'Failed to send message');
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    if (selectedConversation) {
      sendMessageMutation.mutate({ conversationId: selectedConversation, content: newMessage });
    } else if (selectedUser) {
      sendMessageMutation.mutate({ recipientId: selectedUser.id, content: newMessage });
    }
  };

  const handleStartConversation = (targetUser: User) => {
    setSelectedUser(targetUser);
    setSearchQuery("");
    setShowNewConversation(false); // Close the dialog
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex gap-6 h-[calc(100vh-120px)]">
          {/* Conversations List */}
          <div className="w-1/3 min-w-[320px]">
            <Card className="h-full bg-dark-card border-subtle-border shadow-lg">
              <CardHeader className="pb-3 border-b border-subtle-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={20} className="text-accent-beige" />
                    <CardTitle className="text-xl text-beige-text">Messages</CardTitle>
                  </div>
                  <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-accent-beige text-dark-bg hover:bg-accent-beige/90 flex items-center gap-1">
                        <Plus size={16} />
                        <span className="hidden sm:inline"></span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-dark-card border-subtle-border max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-beige-text flex items-center gap-2">
                          <Plus size={18} />
                          Start New Conversation
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search size={16} className="absolute left-3 top-3 text-beige-text/50" />
                          <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-dark-bg border-subtle-border text-beige-text rounded-xl"
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {searchResults.length === 0 && searchQuery.length >= 2 && (
                            <div className="text-center py-8 text-beige-text/50">
                              <div className="w-12 h-12 bg-accent-beige/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <span className="text-accent-beige/50 font-semibold">@</span>
                              </div>
                              <p className="text-sm">No users found for "{searchQuery}"</p>
                            </div>
                          )}
                          {searchQuery.length < 2 && (
                            <div className="text-center py-8 text-beige-text/40">
                              <Search size={24} className="mx-auto mb-3 text-beige-text/30" />
                              <p className="text-sm">Type at least 2 characters to search</p>
                            </div>
                          )}
                          {searchResults.map((searchUser: User) => (
                            <div
                              key={searchUser.id}
                              onClick={() => handleStartConversation(searchUser)}
                              className="flex items-center gap-3 p-3 hover:bg-dark-bg/50 rounded-xl cursor-pointer transition-all duration-200 group"
                            >
                              <div className="flex-1">
                                <div className={`font-medium group-hover:text-beige-text/90 ${
                                  searchUser.isAI ? 'text-ai-purple' : 'text-human-green'
                                }`}>
                                  @{searchUser.username}
                                </div>
                                {searchUser.bio && (
                                  <div className="text-sm text-beige-text/60 truncate">{searchUser.bio}</div>
                                )}
                              </div>
                              {searchUser.isAI && (
                                <Badge variant="secondary" className="bg-ai-purple/20 text-ai-purple border border-ai-purple/30 text-xs">
                                  AI
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-beige-text/50">
                    <div>
                      <MessageCircle size={48} className="mx-auto mb-4 text-beige-text/30" />
                    </div>
                    <h3 className="font-medium mb-2">No conversations yet</h3>
                    <p className="text-sm">Start a new conversation to begin messaging</p>
                  </div>
                ) : (
                  <div>
                    {conversations.map((conversation: ConversationWithParticipant) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation.id)}
                        className={`p-4 border-b border-subtle-border cursor-pointer transition-all duration-200 ${
                          selectedConversation === conversation.id 
                            ? 'bg-accent-beige/10 border-l-4 border-l-accent-beige shadow-inner' 
                            : conversation.unreadCount > 0 
                              ? 'bg-dark-bg/20 hover:bg-dark-bg/40 border-l-2 border-l-accent-beige/50' 
                              : 'hover:bg-dark-bg/30'
                        }`}
                      >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className={`font-medium truncate transition-colors ${
                              conversation.unreadCount > 0 
                                ? conversation.participant.isAI ? 'text-ai-purple' : 'text-human-green'
                                : conversation.participant.isAI ? 'text-ai-purple/80' : 'text-human-green/80'
                            }`}>
                              @{conversation.participant.username}
                            </div>
                            <div className="flex items-center gap-2">
                              {conversation.unreadCount > 0 && (
                                <Badge 
                                  variant="secondary" 
                                  className="bg-red-500/90 text-dark-bg border-red-500 min-w-[18px] h-5 text-xs font-semibold"
                                >
                                  {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                                </Badge>
                              )}
                              <div className="text-xs text-beige-text/50">
                                {new Date(conversation.lastMessageAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                          {conversation.lastMessage && (
                            <div className={`text-sm truncate transition-colors ${
                              conversation.unreadCount > 0 ? 'text-beige-text/90 font-medium' : 'text-beige-text/60'
                            }`}>
                              {conversation.lastMessage.sender.id === user.id && (
                                <span className="text-accent-beige/70 mr-1">You: </span>
                              )}
                              {conversation.lastMessage.content}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="flex-1">
            {selectedConversation || selectedUser ? (
              <Card className="h-full bg-dark-card border-subtle-border shadow-lg flex flex-col">
                <CardHeader className="pb-4 border-b border-subtle-border bg-dark-bg/40 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedConversation(null);
                        setSelectedUser(null);
                      }}
                      className="lg:hidden hover:bg-dark-bg/50 rounded-full p-2"
                    >
                      <ArrowLeft size={18} />
                    </Button>
                    
                    <div className="flex-1">
                      <div className={`font-semibold text-lg ${
                        selectedUser?.isAI || conversations.find((c: ConversationWithParticipant) => c.id === selectedConversation)?.participant.isAI
                          ? 'text-ai-purple'
                          : 'text-human-green'
                      }`}>
                        @{selectedUser?.username || conversations.find((c: ConversationWithParticipant) => c.id === selectedConversation)?.participant.username}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <Shield size={12} className="text-green-400" />
                        <span className="text-beige-text/60 text-xs">Online</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 p-0 overflow-y-auto bg-gradient-to-b from-dark-bg/5 to-dark-bg/10">
                  <div className="p-4 space-y-3 min-h-full">
                    {messages.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-center text-beige-text/50 py-16">
                        <div>
                          <div className="relative mx-auto mb-6 w-16 h-16 bg-accent-beige/10 rounded-2xl flex items-center justify-center">
                            <MessageCircle size={24} className="text-accent-beige/50" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500/20 border-2 border-green-500/50 rounded-full flex items-center justify-center">
                              <Shield size={10} className="text-green-400" />
                            </div>
                          </div>
                          <h3 className="font-semibold text-lg mb-2 text-beige-text/80">Start chatting</h3>
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((message: MessageWithSender, index: number) => {
                          const isOwnMessage = message.senderId === user.id;
                          const isLastMessage = index === messages.length - 1;
                          const nextMessage = messages[index + 1];
                          const isLastInGroup = !nextMessage || nextMessage.senderId !== message.senderId;
                          
                          // Find the last message that was read by the recipient (for our messages)
                          const lastReadMessageIndex = isOwnMessage ? (() => {
                            let lastIndex = -1;
                            for (let i = messages.length - 1; i >= 0; i--) {
                              if (messages[i].senderId === user.id && messages[i].read) {
                                lastIndex = i;
                                break;
                              }
                            }
                            return lastIndex;
                          })() : -1;
                          
                          const shouldShowSeenIndicator = isOwnMessage && index === lastReadMessageIndex && lastReadMessageIndex !== -1;
                          
                          return (
                            <div key={message.id}>
                              <div
                                className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`max-w-[75%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                                  <div
                                    className={`rounded-2xl px-4 py-3 shadow-sm transition-all ${
                                      isOwnMessage
                                        ? 'bg-accent-beige text-dark-bg shadow-md ml-auto rounded-br-md'
                                        : 'bg-dark-card border border-subtle-border text-beige-text rounded-bl-md'
                                    }`}
                                  >
                                    <div className="text-sm leading-relaxed break-words">
                                      {message.content}
                                    </div>
                                    
                                    <div className={`flex items-center gap-1 mt-2 ${
                                      isOwnMessage ? 'justify-end' : 'justify-start'
                                    }`}>
                                      <div className={`text-xs ${
                                        isOwnMessage ? 'text-dark-bg/70' : 'text-beige-text/50'
                                      }`}>
                                        {new Date(message.createdAt).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: false
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Show seen indicator below the last read message */}
                              {shouldShowSeenIndicator && (
                                <div className="flex justify-end mt-1 mb-2">
                                  <div className="flex items-center gap-1 text-xs text-beige-text/40">
                                    <Eye size={12} className="text-beige-text/40" />
                                    <span>
                                      Seen {message.readAt ? new Date(message.readAt).toLocaleString('en-US', {
                                        month: 'short', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                      }) : ''}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>
                </CardContent>
                
                <div className="p-4 border-t border-subtle-border bg-dark-bg/40 backdrop-blur-sm">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Textarea
                        placeholder={`Message ${selectedUser?.username || conversations.find((c: ConversationWithParticipant) => c.id === selectedConversation)?.participant.username}...`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="min-h-[48px] max-h-[120px] bg-dark-bg border-subtle-border text-beige-text placeholder:text-beige-text/50 resize-none rounded-xl focus:ring-2 focus:ring-accent-beige/50 transition-all"
                        rows={1}
                      />
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      className="bg-accent-beige text-dark-bg hover:bg-accent-beige/90 h-12 w-12 rounded-xl p-0 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendMessageMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-center mt-2 text-xs text-beige-text/40">
                    <Shield size={10} className="mr-1" />
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="h-full bg-dark-card border-subtle-border shadow-lg flex items-center justify-center">
                <div className="text-center text-beige-text/50 max-w-md mx-auto p-8">
                  <div className="relative mx-auto mb-8 w-20 h-20">
                    <div className="w-full h-full bg-accent-beige/10 rounded-3xl flex items-center justify-center">
                      <MessageCircle size={32} className="text-accent-beige/40" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-beige-text/80">Messages</h3>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
