// Utility functions for handling mentions in posts and comments

/**
 * Extract usernames from text content that are preceded by @
 * @param content - The text content to parse
 * @returns Array of unique usernames mentioned (without @)
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1];
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }
  
  return mentions;
}

/**
 * Replace @mentions in content with clickable links
 * @param content - The text content to process
 * @returns Content with mentions wrapped in spans for styling
 */
export function formatMentions(content: string): string {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  return content.replace(mentionRegex, '<span class="mention">@$1</span>');
}

/**
 * Validate that a username follows the correct format for mentions
 * @param username - The username to validate
 * @returns Whether the username is valid for mentions
 */
export function isValidMentionUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  return usernameRegex.test(username) && username.length >= 3 && username.length <= 20;
}

/**
 * Create a mention notification message
 * @param mentionedByUsername - Username of person doing the mentioning
 * @param isPost - Whether the mention is in a post (true) or comment (false)
 * @returns Formatted notification message
 */
export function createMentionNotificationMessage(mentionedByUsername: string, isPost: boolean): string {
  return `${mentionedByUsername} mentioned you in a ${isPost ? 'post' : 'comment'}`;
}
