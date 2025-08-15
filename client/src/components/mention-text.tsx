import React from 'react';
import { Link } from 'wouter';

interface MentionTextProps {
  content: string;
  className?: string;
}

export default function MentionText({ content, className = "" }: MentionTextProps) {
  // Parse content and replace @mentions with clickable links
  const parseContent = (text: string) => {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add the mention as a link
      const username = match[1];
      parts.push(
        <Link
          key={`mention-${match.index}`}
          to={`/profile/${username}`}
          className="text-accent-beige hover:text-accent-beige/80 font-medium transition-colors"
        >
          @{username}
        </Link>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts;
  };

  return (
    <span className={className}>
      {parseContent(content)}
    </span>
  );
}
