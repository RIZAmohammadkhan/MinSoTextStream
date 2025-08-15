import React, { useState, useRef, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface MentionUser {
  id: string;
  username: string;
  isAI: boolean;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  minHeight?: string;
}

export default function MentionInput({
  value,
  onChange,
  placeholder = "What's on your mind?",
  className = "",
  maxLength,
  minHeight = "120px"
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the component to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simple dropdown positioning - position below textarea for now
  const updateDropdownPosition = () => {
    if (textareaRef.current && containerRef.current) {
      const textareaRect = textareaRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      setDropdownPosition({
        top: textareaRect.height + 8, // Position below textarea with some margin
        left: 0
      });
    }
  };

  // Extract current mention query (improved)
  const getCurrentMentionQuery = (text: string, cursorPos: number): { query: string; start: number } | null => {
    // Get text before cursor
    const beforeCursor = text.substring(0, cursorPos);
    
    // Find the last @ that could start a mention
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return null;
    
    // Check if the @ is at the start or preceded by whitespace
    const charBeforeAt = lastAtIndex > 0 ? beforeCursor[lastAtIndex - 1] : ' ';
    if (charBeforeAt !== ' ' && charBeforeAt !== '\n' && charBeforeAt !== '\t' && lastAtIndex !== 0) {
      return null;
    }
    
    // Get the text after @ up to cursor
    const afterAt = beforeCursor.substring(lastAtIndex + 1);
    
    // Check if it contains only valid username characters
    if (!/^[a-zA-Z0-9_]*$/.test(afterAt)) {
      return null;
    }
    
    return {
      query: afterAt,
      start: lastAtIndex + 1 // Position after @
    };
  };

  // Search for users
  const searchUsers = async (query: string) => {
    if (query.length === 0) {
      setSuggestions([]);
      return;
    }
    
    try {
      console.log('Searching for users with query:', query); // Debug log
      const response = await apiRequest('GET', `/api/users/mentions?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        console.error('Search failed with status:', response.status);
        setSuggestions([]);
        return;
      }
      
      const users = await response.json();
      console.log('Found users:', users); // Debug log
      setSuggestions(users);
    } catch (error) {
      console.error('Error searching users:', error);
      setSuggestions([]);
    }
  };

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    
    const mentionQuery = getCurrentMentionQuery(newValue, cursorPos);
    console.log('Mention query detected:', mentionQuery); // Debug log
    
    if (mentionQuery && textareaRef.current) {
      setMentionStart(mentionQuery.start);
      setShowSuggestions(true);
      setSelectedIndex(0);
      
      // Update dropdown position
      updateDropdownPosition();
      
      searchUsers(mentionQuery.query);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Handle mention selection (improved)
  const selectMention = (user: MentionUser) => {
    const textarea = textareaRef.current;
    if (!textarea || mentionStart === -1) return;
    
    const cursorPos = textarea.selectionStart;
    
    // Find the @ symbol position
    const beforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return;
    
    // Replace from @ to cursor with the mention
    const beforeMention = value.substring(0, lastAtIndex);
    const afterCursor = value.substring(cursorPos);
    const newValue = beforeMention + `@${user.username} ` + afterCursor;
    
    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionStart(-1);
    
    // Set cursor position after the mention
    setTimeout(() => {
      const newCursorPos = lastAtIndex + user.username.length + 2; // +2 for @ and space
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        selectMention(suggestions[selectedIndex]);
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSuggestions([]);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full bg-transparent text-beige-text placeholder-beige-text/40 resize-none border-none outline-none text-lg leading-relaxed p-0 ${className}`}
        style={{ minHeight }}
        maxLength={maxLength}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div 
          className="absolute z-[9999] bg-dark-bg border border-subtle-border rounded-lg shadow-xl max-h-48 overflow-y-auto min-w-[200px] backdrop-blur-sm"
          style={{
            top: `${Math.max(0, dropdownPosition.top)}px`,
            left: `${Math.max(0, Math.min(dropdownPosition.left, window.innerWidth - 220))}px`,
            maxWidth: '300px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
          }}
        >
          {suggestions.map((user, index) => (
            <div
              key={user.id}
              className={`px-3 py-2 cursor-pointer flex items-center space-x-2 first:rounded-t-lg last:rounded-b-lg transition-all duration-150 ${
                index === selectedIndex 
                  ? 'bg-accent-beige/15 text-accent-beige border-l-2 border-accent-beige' 
                  : 'text-beige-text hover:bg-subtle-bg/50'
              }`}
              onClick={() => selectMention(user)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="font-medium">@{user.username}</span>
              {user.isAI && (
                <span className="text-xs px-1.5 py-0.5 bg-accent-beige/20 text-accent-beige rounded-full">
                  AI
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
