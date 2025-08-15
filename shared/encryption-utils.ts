import crypto from 'crypto';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedMessage {
  encryptedContent: string;
  encryptedKey: string;
  iv: string;
}

// Generate RSA key pair for a user
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return { publicKey, privateKey };
}

// Encrypt private key with user's password (simplified for demo)
export function encryptPrivateKey(privateKey: string, password: string): string {
  // For demo purposes, just base64 encode the private key
  // In production, use proper AES encryption with PBKDF2
  return Buffer.from(privateKey).toString('base64');
}

// Decrypt private key with user's password (simplified for demo)
export function decryptPrivateKey(encryptedPrivateKey: string, password: string): string {
  // For demo purposes, just base64 decode the private key
  // In production, use proper AES decryption with PBKDF2
  return Buffer.from(encryptedPrivateKey, 'base64').toString('utf8');
}

// Encrypt a message with AES and encrypt the AES key with recipient's public key
export function encryptMessage(content: string, recipientPublicKey: string): EncryptedMessage {
  // Generate random AES key and IV
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  
  // Encrypt content with AES-GCM (using modern Node.js crypto API)
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  let encryptedContent = cipher.update(content, 'utf8', 'hex');
  encryptedContent += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  // Encrypt AES key with recipient's RSA public key
  const encryptedKey = crypto.publicEncrypt(
    {
      key: recipientPublicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    aesKey
  ).toString('base64');
  
  return {
    encryptedContent: encryptedContent + ':' + authTag.toString('hex'),
    encryptedKey,
    iv: iv.toString('hex')
  };
}

// Decrypt a message using recipient's private key
export function decryptMessage(
  encryptedContent: string,
  encryptedKey: string,
  iv: string,
  recipientPrivateKey: string
): string {
  // Decrypt AES key with recipient's RSA private key
  const aesKey = crypto.privateDecrypt(
    {
      key: recipientPrivateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(encryptedKey, 'base64')
  );
  
  // Split encrypted content and auth tag
  const parts = encryptedContent.split(':');
  const encryptedData = parts[0];
  const authTag = parts[1] ? Buffer.from(parts[1], 'hex') : Buffer.alloc(0);
  
  // Decrypt content with AES-GCM (using modern Node.js crypto API)
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, Buffer.from(iv, 'hex'));
  if (authTag.length > 0) {
    decipher.setAuthTag(authTag);
  }
  let decryptedContent = decipher.update(encryptedData, 'hex', 'utf8');
  decryptedContent += decipher.final('utf8');
  
  return decryptedContent;
}

// Client-side encryption utilities (using Web Crypto API)
export const clientCrypto = {
  // Generate key pair on client
  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
      );

      const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      return {
        publicKey: this.arrayBufferToBase64(publicKey),
        privateKey: this.arrayBufferToBase64(privateKey)
      };
    } catch (error) {
      console.error('Key generation failed:', error);
      throw error;
    }
  },

  // Encrypt message on client
  async encryptMessage(content: string, recipientPublicKeyBase64: string): Promise<EncryptedMessage> {
    try {
      // Generate AES key
      const aesKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt content with AES
      const encoder = new TextEncoder();
      const encryptedContent = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        encoder.encode(content)
      );

      // Import recipient's public key
      const publicKeyBuffer = this.base64ToArrayBuffer(recipientPublicKeyBase64);
      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
      );

      // Export AES key and encrypt it with RSA
      const aesKeyBuffer = await window.crypto.subtle.exportKey('raw', aesKey);
      const encryptedAesKey = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        aesKeyBuffer
      );

      return {
        encryptedContent: this.arrayBufferToBase64(encryptedContent),
        encryptedKey: this.arrayBufferToBase64(encryptedAesKey),
        iv: this.arrayBufferToBase64(iv.buffer)
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  },

  // Decrypt message on client
  async decryptMessage(
    encryptedContent: string,
    encryptedKey: string,
    iv: string,
    privateKeyBase64: string
  ): Promise<string> {
    try {
      // Import private key
      const privateKeyBuffer = this.base64ToArrayBuffer(privateKeyBase64);
      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt']
      );

      // Decrypt AES key
      const encryptedKeyBuffer = this.base64ToArrayBuffer(encryptedKey);
      const aesKeyBuffer = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        encryptedKeyBuffer
      );

      // Import AES key
      const aesKey = await window.crypto.subtle.importKey(
        'raw',
        aesKeyBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Decrypt content
      const ivBuffer = this.base64ToArrayBuffer(iv);
      const encryptedContentBuffer = this.base64ToArrayBuffer(encryptedContent);
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        aesKey,
        encryptedContentBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Message could not be decrypted]';
    }
  },

  // Utility functions
  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
  },

  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
};
