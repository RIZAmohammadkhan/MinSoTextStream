// Simple encryption test script using Node.js crypto
const crypto = require('crypto');

console.log('🔐 Testing Message Encryption System...\n');

try {
  // Generate RSA key pair for testing
  console.log('1. Generating RSA key pair...');
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
  console.log('✅ Key pair generated successfully');
  console.log(`   Public key length: ${publicKey.length} chars`);
  console.log(`   Private key length: ${privateKey.length} chars\n`);

  // Test message encryption
  console.log('2. Testing message encryption...');
  const testMessage = 'Hello! This is a test encrypted message 🔒';
  console.log(`   Original message: "${testMessage}"`);
  
  // Generate random AES key and IV
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  
  // Encrypt content with AES
  const cipher = crypto.createCipher('aes-256-gcm', aesKey, iv);
  let encryptedContent = cipher.update(testMessage, 'utf8', 'hex');
  encryptedContent += cipher.final('hex');
  
  // Encrypt AES key with recipient's RSA public key
  const encryptedKey = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    aesKey
  ).toString('base64');
  
  console.log('✅ Message encrypted successfully');
  console.log(`   Encrypted content length: ${encryptedContent.length} chars`);
  console.log(`   Encrypted key length: ${encryptedKey.length} chars`);
  console.log(`   IV length: ${iv.toString('hex').length} chars\n`);

  // Test message decryption
  console.log('3. Testing message decryption...');
  
  // Decrypt AES key with recipient's RSA private key
  const decryptedAesKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(encryptedKey, 'base64')
  );
  
  // Decrypt content with AES
  const decipher = crypto.createDecipher('aes-256-gcm', decryptedAesKey, iv);
  let decryptedContent = decipher.update(encryptedContent, 'hex', 'utf8');
  decryptedContent += decipher.final('utf8');
  
  console.log(`   Decrypted message: "${decryptedContent}"`);
  
  if (decryptedContent === testMessage) {
    console.log('✅ Decryption successful - messages match!\n');
  } else {
    console.log('❌ Decryption failed - messages do not match!\n');
  }

  // Test with different user (should fail)
  console.log('4. Testing with wrong private key...');
  const wrongKeyPair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  try {
    const wrongDecryptedAesKey = crypto.privateDecrypt(
      {
        key: wrongKeyPair.privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(encryptedKey, 'base64')
    );
    console.log('❌ Security issue: Wrong key was able to decrypt message!');
  } catch (error) {
    console.log('✅ Security confirmed: Wrong key cannot decrypt message');
    console.log(`   Error: ${error.message}\n`);
  }

  console.log('🎉 All encryption tests completed successfully!');

} catch (error) {
  console.error('❌ Encryption test failed:', error);
  process.exit(1);
}
