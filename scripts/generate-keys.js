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

// Check if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  // Development: Create or update .env file
  const envPath = path.join(__dirname, '..', '.env');
  
  // Check if .env already exists
  let existingEnv = {};
  let envComments = [];
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    // Parse existing environment variables and comments
    envContent.split('\n').forEach(line => {
      if (line.trim().startsWith('#')) {
        envComments.push(line);
      } else if (line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('='); // Handle values with = in them
        if (key && value) {
          existingEnv[key.trim()] = value.trim();
        }
      }
    });
  }
  
  // Only generate new values for keys that don't exist or are empty
  const sessionSecret = existingEnv.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  const privateKey = keyPair.privateKey.replace(/\n/g, '\\n');
  
  // Build the .env content preserving existing values
  const envLines = [];
  
  // Add comments if they exist, otherwise use defaults
  if (envComments.length > 0) {
    envLines.push(...envComments);
  } else {
    envLines.push('# BlueSky OAuth Configuration');
  }
  
  // Add environment variables, preserving existing values
  envLines.push(`BLUESKY_CLIENT_ID=${existingEnv.BLUESKY_CLIENT_ID || 'http://127.0.0.1:3001/client-metadata.json'}`);
  envLines.push(`BLUESKY_REDIRECT_URI=${existingEnv.BLUESKY_REDIRECT_URI || 'http://127.0.0.1:3001/auth/oauth-callback'}`);
  envLines.push('');
  
  if (!envComments.some(c => c.includes('Server Configuration'))) {
    envLines.push('# Server Configuration');
  }
  envLines.push(`PORT=${existingEnv.PORT || '3001'}`);
  envLines.push(`NODE_ENV=${existingEnv.NODE_ENV || 'development'}`);
  envLines.push('');
  
  if (!envComments.some(c => c.includes('Session Configuration'))) {
    envLines.push('# Session Configuration');
  }
  envLines.push(`SESSION_SECRET=${sessionSecret}`);
  envLines.push('');
  
  if (!envComments.some(c => c.includes('Private Key'))) {
    envLines.push('# Private Key for OAuth (DO NOT SHARE)');
  }
  envLines.push(`PRIVATE_KEY=${privateKey}`);
  
  // Add any additional environment variables that existed but aren't in our standard set
  const standardKeys = ['BLUESKY_CLIENT_ID', 'BLUESKY_REDIRECT_URI', 'PORT', 'NODE_ENV', 'SESSION_SECRET', 'PRIVATE_KEY'];
  Object.keys(existingEnv).forEach(key => {
    if (!standardKeys.includes(key)) {
      envLines.push(`${key}=${existingEnv[key]}`);
    }
  });
  
  const envContent = envLines.join('\n') + '\n';
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Keys generated successfully!');
  console.log('📁 Private key saved to: keys/private-key.pem');
  console.log('📁 Public key saved to: keys/public-key.pem');
  console.log('📁 Environment file created: .env');
} else {
  // Production: Output key for environment variable
  console.log('✅ Keys generated successfully!');
  console.log('📁 Private key saved to: keys/private-key.pem');
  console.log('📁 Public key saved to: keys/public-key.pem');
  console.log('');
  console.log('🔑 PRODUCTION: Set this environment variable:');
  console.log('PRIVATE_KEY=' + keyPair.privateKey.replace(/\n/g, '\\n'));
  console.log('');
  console.log('🔐 Keep your private key secure and never commit it to version control!');
}
