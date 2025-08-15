import crypto from 'crypto';

// Simple server-side encryption using AES
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here'; // Should be 32 characters
const ALGORITHM = 'aes-256-gcm';

export interface EncryptedData {
  encryptedContent: string;
  iv: string;
  authTag: string;
}

// Encrypt message content on server
export function encryptMessage(content: string): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  cipher.setAAD(Buffer.from('additional data'));
  
  let encryptedContent = cipher.update(content, 'utf8', 'hex');
  encryptedContent += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedContent,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

// Decrypt message content on server
export function decryptMessage(encryptedData: EncryptedData): string {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  decipher.setAAD(Buffer.from('additional data'));
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decryptedContent = decipher.update(encryptedData.encryptedContent, 'hex', 'utf8');
  decryptedContent += decipher.final('utf8');
  
  return decryptedContent;
}

// Simple encryption for storage (using AES with fixed key)
export function simpleEncrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

// Simple decryption for storage
export function simpleDecrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
