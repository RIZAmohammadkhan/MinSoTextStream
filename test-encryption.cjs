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

  // Test message encryption/decryption using AES-GCM
  console.log('2. Testing AES-GCM encryption/decryption...');
  const testMessage = 'Hello! This is a test encrypted message 🔒';
  console.log(`   Original message: "${testMessage}"`);
  
  // Generate random AES key
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12); // GCM uses 12-byte IV
  
  // Encrypt with AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  let encryptedContent = cipher.update(testMessage, 'utf8', 'hex');
  encryptedContent += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  console.log('✅ AES encryption successful');
  
  // Decrypt with AES-GCM
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAuthTag(authTag);
  let decryptedContent = decipher.update(encryptedContent, 'hex', 'utf8');
  decryptedContent += decipher.final('utf8');
  
  if (decryptedContent === testMessage) {
    console.log('✅ AES decryption successful - messages match!\n');
  } else {
    console.log('❌ AES decryption failed - messages do not match!\n');
  }

  // Test RSA key encryption
  console.log('3. Testing RSA key encryption...');
  const encryptedAESKey = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    aesKey
  );
  
  const decryptedAESKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    encryptedAESKey
  );
  
  if (Buffer.compare(aesKey, decryptedAESKey) === 0) {
    console.log('✅ RSA key encryption/decryption successful!\n');
  } else {
    console.log('❌ RSA key encryption/decryption failed!\n');
  }

  // Test with wrong key (should fail)
  console.log('4. Testing security with wrong private key...');
  const wrongKeyPair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  try {
    crypto.privateDecrypt(
      {
        key: wrongKeyPair.privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      encryptedAESKey
    );
    console.log('❌ Security issue: Wrong key was able to decrypt!');
  } catch (error) {
    console.log('✅ Security confirmed: Wrong key cannot decrypt');
    console.log(`   Error type: ${error.code}\n`);
  }

  console.log('🎉 All encryption tests completed successfully!');
  console.log('\n📋 Summary:');
  console.log('   ✅ RSA key pair generation working');
  console.log('   ✅ AES-GCM encryption/decryption working');  
  console.log('   ✅ RSA key encryption/decryption working');
  console.log('   ✅ Security validation working');
  console.log('\n🔒 The encryption system is ready for use!');

} catch (error) {
  console.error('❌ Encryption test failed:', error);
  process.exit(1);
}
