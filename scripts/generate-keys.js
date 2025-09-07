const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate ECDSA key pair (ES256)
const keyPair = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1', // P-256 curve for ES256
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Create keys directory if it doesn't exist
const keysDir = path.join(__dirname, '..', 'keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Write keys to files
fs.writeFileSync(path.join(keysDir, 'private-key.pem'), keyPair.privateKey);
fs.writeFileSync(path.join(keysDir, 'public-key.pem'), keyPair.publicKey);

// Also create a .env file with the private key
const envContent = `# BlueSky OAuth Configuration
BLUESKY_CLIENT_ID=http://localhost:2222/client-metadata.json
BLUESKY_REDIRECT_URI=http://localhost:2222/oauth-callback

# Server Configuration
PORT=2222
NODE_ENV=development

# Session Configuration
SESSION_SECRET=${crypto.randomBytes(32).toString('hex')}

# Private Key for OAuth (DO NOT SHARE)
PRIVATE_KEY=${keyPair.privateKey.replace(/\n/g, '\\n')}
`;

fs.writeFileSync(path.join(__dirname, '..', '.env'), envContent);

console.log('✅ Keys generated successfully!');
console.log('📁 Private key saved to: keys/private-key.pem');
console.log('📁 Public key saved to: keys/public-key.pem');
console.log('📁 Environment file created: .env');
console.log('');
console.log('🔐 Keep your private key secure and never commit it to version control!');
