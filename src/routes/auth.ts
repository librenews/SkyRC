import 'dotenv/config';
import express from 'express';
import { NodeOAuthClient, NodeSavedSession } from '@bluesky-social/oauth-client-node';
import { JoseKey } from '@bluesky-social/jwk-jose';
import { BskyAgent } from '@atproto/api';

const router = express.Router();

// In-memory stores (in production, use Redis or database)
const stateStore = new Map<string, any>();
const sessionStore = new Map<string, any>();

// Load private key from environment with fallback generation
const privateKey = (() => {
  if (process.env.PRIVATE_KEY) {
    console.log('🔑 Found PRIVATE_KEY in environment');
    console.log('Raw key length:', process.env.PRIVATE_KEY.length);
    console.log('Raw key preview:', process.env.PRIVATE_KEY.substring(0, 50));
    
    // Try to process the key
    let processedKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
    console.log('Processed key length:', processedKey.length);
    console.log('Processed key preview:', processedKey.substring(0, 50));
    
    // Validate the key format
    if (!processedKey.includes('-----BEGIN PRIVATE KEY-----') || !processedKey.includes('-----END PRIVATE KEY-----')) {
      console.error('❌ Invalid private key format - missing PEM headers');
      console.log('🔄 Will generate new key instead...');
      return null; // Return null to trigger key generation
    }
    
    return processedKey;
  } else {
    console.log('⚠️ No PRIVATE_KEY found, generating temporary key...');
    const crypto = require('crypto');
    const keyPair = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    console.log('🔑 Temporary key generated (not persistent across restarts)');
    return keyPair.privateKey;
  }
})();

// Initialize BlueSky OAuth client
let oauthClient: NodeOAuthClient | null = null;

const initializeOAuthClient = async () => {
  try {
    console.log('🚀 Starting OAuth client initialization...');
    console.log('🔑 Loading private key...');
    console.log('Private key length:', privateKey.length);
    console.log('Private key starts with:', privateKey.substring(0, 50));
    console.log('Private key ends with:', privateKey.substring(privateKey.length - 50));
    console.log('Private key full length check:', privateKey.length);
    console.log('Private key contains BEGIN:', privateKey.includes('-----BEGIN PRIVATE KEY-----'));
    console.log('Private key contains END:', privateKey.includes('-----END PRIVATE KEY-----'));
    
    // Handle case where privateKey is null (corrupted or missing)
    let key;
    if (!privateKey) {
      console.log('🔄 No valid private key found, generating new one...');
      const crypto = require('crypto');
      const newKeyPair = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      const newPrivateKey = newKeyPair.privateKey;
      console.log('🔑 Generated new private key');
      key = await JoseKey.fromImportable(newPrivateKey, 'key1');
      console.log('✅ New private key loaded successfully');
    } else {
      // Additional validation
      if (privateKey.length < 100) {
        throw new Error(`Private key too short: ${privateKey.length} characters`);
      }
      try {
        key = await JoseKey.fromImportable(privateKey, 'key1');
        console.log('✅ Private key loaded successfully');
      } catch (keyError) {
        console.error('❌ Failed to parse private key:', keyError);
        const keyErrorMessage = keyError instanceof Error ? keyError.message : String(keyError);
        console.log('🔍 Key parsing error message:', keyErrorMessage);
        
        if (keyErrorMessage.includes('not enough data') || keyErrorMessage.includes('Invalid private key')) {
          console.log('🔄 Attempting to generate a new private key...');
          const crypto = require('crypto');
          const newKeyPair = crypto.generateKeyPairSync('ec', {
            namedCurve: 'prime256v1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
          });
          
          const newPrivateKey = newKeyPair.privateKey;
          console.log('🔑 Generated new private key, retrying...');
          console.log('🔑 New key length:', newPrivateKey.length);
          console.log('🔑 New key preview:', newPrivateKey.substring(0, 50));
          key = await JoseKey.fromImportable(newPrivateKey, 'key1');
          console.log('✅ New private key loaded successfully');
          console.log('⚠️  Note: Using auto-generated private key. For production, consider setting a proper PRIVATE_KEY environment variable.');
        } else {
          throw keyError; // Re-throw if it's not a key parsing error
        }
      }
    }
    
    // Determine if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    const port = process.env.PORT || '3001';
    
    console.log('🔍 Environment variables debug:');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  PORT:', process.env.PORT);
    console.log('  CLIENT_URL:', process.env.CLIENT_URL);
    console.log('  isDevelopment:', isDevelopment);
    console.log('  All env vars:', Object.keys(process.env).filter(k => k.includes('CLIENT') || k.includes('BLUESKY')));
    
    // Use different URLs for development vs production
    const baseUrl = isDevelopment 
      ? `http://127.0.0.1:${port}` 
      : process.env.CLIENT_URL;
    
    console.log('  baseUrl:', baseUrl);
    
    if (!baseUrl) {
      throw new Error('CLIENT_URL environment variable is required for production');
    }
    
    console.log('🔍 OAuth client metadata debug:');
    console.log('  - BLUESKY_CLIENT_ID:', process.env.BLUESKY_CLIENT_ID);
    console.log('  - baseUrl:', baseUrl);
    console.log('  - final client_id:', process.env.BLUESKY_CLIENT_ID || baseUrl);
    console.log('  - final client_uri:', baseUrl);
    
    oauthClient = new NodeOAuthClient({
      clientMetadata: {
        client_id: process.env.BLUESKY_CLIENT_ID || baseUrl,
        client_name: 'SkyRC Chat',
        client_uri: baseUrl,
        logo_uri: `${baseUrl}/logo.png`,
        redirect_uris: [`${baseUrl}/auth/oauth-callback`],
        grant_types: ['authorization_code', 'refresh_token'],
        scope: 'atproto transition:generic',
        response_types: ['code'],
        application_type: 'web',
        token_endpoint_auth_method: 'private_key_jwt',
        token_endpoint_auth_signing_alg: 'ES256',
        dpop_bound_access_tokens: true,
        jwks_uri: `${baseUrl}/auth/jwks.json`,
      },
      keyset: [key],
      stateStore: {
        async set(key: string, state: any): Promise<void> {
          stateStore.set(key, state);
        },
        async get(key: string): Promise<any> {
          return stateStore.get(key);
        },
        async del(key: string): Promise<void> {
          stateStore.delete(key);
        },
      },
      sessionStore: {
        async set(sub: string, session: NodeSavedSession): Promise<void> {
          sessionStore.set(sub, session);
        },
        async get(sub: string): Promise<NodeSavedSession | undefined> {
          return sessionStore.get(sub);
        },
        async del(sub: string): Promise<void> {
          sessionStore.delete(sub);
        },
      },
    });
    console.log('✅ OAuth client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize OAuth client:', error);
    console.error('Error details:', error);
    
    // If the private key is corrupted, try generating a new one
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('🔍 Checking if fallback should trigger. Error message:', errorMessage);
    if (errorMessage.includes('not enough data') || errorMessage.includes('Invalid private key')) {
      console.log('🔄 Attempting to generate a new private key...');
      try {
        const crypto = require('crypto');
        const newKeyPair = crypto.generateKeyPairSync('ec', {
          namedCurve: 'prime256v1',
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        
        console.log('🔑 Generated new private key, retrying OAuth initialization...');
        
        // Retry with the new key
        const newKey = await JoseKey.fromImportable(newKeyPair.privateKey, 'key1');
        
        // Determine if we're in development mode
        const isDevelopment = process.env.NODE_ENV === 'development';
        const port = process.env.PORT || '3001';
        const baseUrl = isDevelopment 
          ? `http://127.0.0.1:${port}` 
          : process.env.CLIENT_URL;
        
        if (!baseUrl) {
          throw new Error('CLIENT_URL environment variable is required for production');
        }
        
        console.log('🔍 Fallback OAuth client metadata debug:');
        console.log('  - BLUESKY_CLIENT_ID:', process.env.BLUESKY_CLIENT_ID);
        console.log('  - baseUrl:', baseUrl);
        console.log('  - final client_id:', process.env.BLUESKY_CLIENT_ID || baseUrl);
        console.log('  - final client_uri:', baseUrl);
        
        oauthClient = new NodeOAuthClient({
          clientMetadata: {
            client_id: process.env.BLUESKY_CLIENT_ID || baseUrl,
            client_name: 'SkyRC Chat',
            client_uri: baseUrl,
            logo_uri: `${baseUrl}/logo.png`,
            redirect_uris: [`${baseUrl}/auth/oauth-callback`],
            grant_types: ['authorization_code', 'refresh_token'],
            scope: 'atproto transition:generic',
            response_types: ['code'],
            application_type: 'web',
            token_endpoint_auth_method: 'private_key_jwt',
            token_endpoint_auth_signing_alg: 'ES256',
            dpop_bound_access_tokens: true,
            jwks_uri: `${baseUrl}/auth/jwks.json`,
          },
          keyset: [newKey],
          stateStore: {
            async set(key: string, state: any): Promise<void> {
              stateStore.set(key, state);
            },
            async get(key: string): Promise<any> {
              return stateStore.get(key);
            },
            async del(key: string): Promise<void> {
              stateStore.delete(key);
            },
          },
          sessionStore: {
            async set(sub: string, session: NodeSavedSession): Promise<void> {
              sessionStore.set(sub, session);
            },
            async get(sub: string): Promise<NodeSavedSession | undefined> {
              return sessionStore.get(sub);
            },
            async del(sub: string): Promise<void> {
              sessionStore.delete(sub);
            },
          },
        });
        console.log('✅ OAuth client initialized successfully with new key');
      } catch (retryError) {
        console.error('❌ Failed to initialize OAuth client even with new key:', retryError);
      }
    }
  }
};

// Initialize the OAuth client
initializeOAuthClient();

// Expose client metadata
router.get('/client-metadata.json', (req, res) => {
  if (!oauthClient) {
    return res.status(500).json({ error: 'OAuth client not initialized' });
  }
  res.json(oauthClient.clientMetadata);
});

// Expose JWKS
router.get('/jwks.json', (req, res) => {
  if (!oauthClient) {
    return res.status(500).json({ error: 'OAuth client not initialized' });
  }
  res.json(oauthClient.jwks);
});

// Generate authorization URL
router.get('/login', async (req, res) => {
  try {
    console.log('🔐 OAuth login request received');
    
    if (!oauthClient) {
      console.error('❌ OAuth client not initialized');
      return res.status(500).json({ error: 'OAuth client not initialized' });
    }
    
    console.log('✅ OAuth client is initialized');
    
    // Get the handle and room from query parameters
    const handle = req.query.handle as string;
    const room = req.query.room as string;
    console.log('👤 Handle provided:', handle || 'none');
    console.log('🏠 Room provided:', room || 'none');
    
    // Determine the correct PDS for the handle
    let pdsUrl = 'https://bsky.social'; // Default fallback
    
    if (handle) {
      console.log('🔍 Resolving handle to find PDS:', handle);
      
      try {
        // Parse the handle to extract domain
        let handleDomain = 'bsky.social';
        if (handle.includes('.')) {
          // Handle is in format: username.domain (no @ needed)
          handleDomain = handle.split('.').slice(1).join('.');
        }
        
        console.log('🌐 Extracted domain from handle:', handleDomain);
        
        // Try to resolve the handle to get PDS information
        if (handleDomain !== 'bsky.social') {
          console.log('🔍 Attempting to resolve handle via bsky.social...');
          
          // Use handle directly (no @ symbol needed)
          const resolveUrl = `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`;
          console.log('🌐 Resolving handle at:', resolveUrl);
          
          const resolveResponse = await fetch(resolveUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            }
          });
          
          if (resolveResponse.ok) {
            const resolveData = await resolveResponse.json() as any;
            console.log('📦 Handle resolution response:', resolveData);
            
            if (resolveData.did) {
              console.log('🔍 Resolving DID to find PDS:', resolveData.did);
              
              // Try to resolve the DID to get PDS information
              const didResolveUrl = `https://plc.directory/${resolveData.did}`;
              console.log('🌐 Resolving DID at:', didResolveUrl);
              
              const didResolveResponse = await fetch(didResolveUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                }
              });
              
              if (didResolveResponse.ok) {
                const didResolveData = await didResolveResponse.json() as any;
                console.log('📦 DID resolution response:', JSON.stringify(didResolveData, null, 2));
                
                // Look for PDS information in the DID document
                if (didResolveData.service && Array.isArray(didResolveData.service)) {
                  console.log('🔍 Found service array with', didResolveData.service.length, 'services');
                  
                  // Log all services for debugging
                  didResolveData.service.forEach((service: any, index: number) => {
                    console.log(`📋 Service ${index}:`, {
                      id: service.id,
                      type: service.type,
                      serviceEndpoint: service.serviceEndpoint
                    });
                  });
                  
                  const pdsService = didResolveData.service.find((s: any) => 
                    s.type === 'AtprotoPersonalDataServer' || 
                    s.id.includes('pds') ||
                    s.serviceEndpoint
                  );
                  
                  if (pdsService && pdsService.serviceEndpoint) {
                    pdsUrl = pdsService.serviceEndpoint;
                    console.log('✅ Found PDS for DID:', pdsUrl);
                    console.log('🔍 PDS service details:', {
                      id: pdsService.id,
                      type: pdsService.type,
                      serviceEndpoint: pdsService.serviceEndpoint
                    });
                  } else {
                    console.log('⚠️ No PDS service found in DID document');
                    console.log('🔍 Available services:', didResolveData.service.map((s: any) => s.type));
                  }
                } else {
                  console.log('⚠️ No service array found in DID document');
                  console.log('🔍 DID document keys:', Object.keys(didResolveData));
                }
              } else {
                console.log('⚠️ DID resolution failed with status:', didResolveResponse.status);
                const errorText = await didResolveResponse.text();
                console.log('📋 Error response:', errorText);
              }
            } else {
              console.log('⚠️ No DID found in handle resolution response');
            }
          } else {
            console.log('⚠️ Handle resolution failed with status:', resolveResponse.status);
            const errorText = await resolveResponse.text();
            console.log('📋 Error response:', errorText);
          }
        } else {
          console.log('🔍 Using bsky.social for bsky.social handle');
        }
      } catch (resolveError) {
        console.log('⚠️ Error resolving handle:', resolveError);
        console.log('🔄 Falling back to bsky.social');
      }
    }
    
    console.log('🔍 Using OAuth provider:', pdsUrl);
    console.log('🔍 PDS URL analysis:', {
      isBskySocial: pdsUrl === 'https://bsky.social',
      isCustomPDS: pdsUrl !== 'https://bsky.social',
      pdsDomain: new URL(pdsUrl).hostname
    });
    
    // Clear any existing sessions to start fresh
    console.log('🧹 Clearing existing sessions...');
    sessionStore.clear();
    
    // Generate state with room information
    const stateId = Math.random().toString(36).substring(7);
    const state = room ? `${stateId}:${room}` : stateId;
    console.log('🎲 Generated state:', state);
    console.log('🏠 Room to redirect to after login:', room || 'general (default)');
    
    // Determine base URL for redirect URI
    const isDevelopment = process.env.NODE_ENV === 'development';
    const port = process.env.PORT || '3001';
    const baseUrl = isDevelopment 
      ? `http://127.0.0.1:${port}` 
      : process.env.CLIENT_URL;
    
    if (!baseUrl) {
      throw new Error('CLIENT_URL environment variable is required for production');
    }
    
    const redirectUri = `${baseUrl}/auth/oauth-callback`;
    console.log('🔄 Redirect URI:', redirectUri);
    
    console.log('🌐 Calling oauthClient.authorize with PDS:', pdsUrl);
    console.log('🔍 OAuth client configuration:', {
      pdsUrl,
      redirectUri,
      state,
      scope: 'atproto'
    });
    
    try {
      const authUrl = await oauthClient.authorize(pdsUrl, {
        redirect_uri: redirectUri as any,
        scope: 'atproto',
        state,
      });
      
      console.log('✅ OAuth authorization URL generated:', authUrl);
      console.log('🔍 OAuth URL analysis:', {
        href: authUrl.href,
        origin: authUrl.origin,
        hostname: authUrl.hostname,
        pathname: authUrl.pathname,
        isBskySocial: authUrl.hostname === 'bsky.social',
        isCustomPDS: authUrl.hostname !== 'bsky.social'
      });
      
      res.redirect(authUrl.href);
    } catch (authError) {
      console.error('💥 OAuth authorize error:', authError);
      throw authError;
    }
  } catch (error) {
    console.error('💥 OAuth error:', error);
    console.error('💥 Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

// Handle OAuth callback
router.get('/oauth-callback', async (req, res) => {
  try {
    console.log('🔄 OAuth callback received!');
    console.log('📋 Query parameters:', req.query);
    console.log('🌐 Request URL:', req.url);
    console.log('🔍 Request headers:', req.headers);
    console.log('📱 User Agent:', req.headers['user-agent']);
    console.log('🍪 Cookies:', req.headers.cookie);
    console.log('🌍 Origin:', req.headers.origin);
    console.log('🔗 Referer:', req.headers.referer);
    
    if (!oauthClient) {
      console.error('❌ OAuth client not initialized');
      return res.status(500).json({ error: 'OAuth client not initialized' });
    }
    
    // Convert query parameters to URLSearchParams format
    const params = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (typeof value === 'string') {
        params.append(key, value);
      }
    });
    console.log('🔧 Parsed params for OAuth client:', params.toString());
    
    console.log('🌐 Calling oauthClient.callback...');
    const { session, state } = await oauthClient.callback(params);
    console.log('✅ OAuth callback successful!');
    console.log('👤 Session DID:', session.did);
    console.log('🎲 Returned state:', state);
    
    // Extract room from state if present
    let redirectRoom = null; // default to home page
    if (state && state.includes(':')) {
      const [, roomFromState] = state.split(':');
      if (roomFromState) {
        redirectRoom = roomFromState;
        console.log('🏠 Room extracted from state:', redirectRoom);
      }
    }
    console.log('🏠 Final redirect room:', redirectRoom || 'home page');
    console.log('🔍 Session object keys:', Object.keys(session));
    console.log('🔍 Session object:', JSON.stringify(session, null, 2));
    
    // Try to fetch profile data using the OAuth session's dpopFetch method
    console.log('🔍 Attempting to fetch profile data using OAuth session...');
    let handle = session.did;
    let displayName = '';
    let avatar = '';
    let description = '';
    
    try {
      const sessionAny = session as any;
      console.log('🔍 OAuth session properties:', Object.keys(sessionAny));
      
      // First, let's inspect the session object more thoroughly
      console.log('🔍 Full session object inspection:');
      console.log('📋 Session keys:', Object.keys(sessionAny));
      console.log('📋 Session server keys:', Object.keys(sessionAny.server || {}));
      console.log('📋 Session serverMetadata:', sessionAny.server?.serverMetadata);
      
      // Skip sessionGetter since it's failing with "session deleted by another process"
      console.log('⚠️ Skipping sessionGetter due to known issue with session deletion');
      
      // Use the correct PDS endpoint for profile data
      console.log('🔍 Using correct PDS endpoint for profile data...');
      
      try {
        const server = sessionAny.server;
        console.log('🔍 Server properties:', Object.keys(server));
        
        if (server && server.dpopFetch) {
          console.log('🔍 Found dpopFetch on server, using correct PDS endpoint...');
          
          // Determine the user's PDS from the session
          // The session should contain information about the user's PDS
          let pdsUrl = 'https://bsky.social'; // Default fallback
          
          // Try to extract PDS URL from the session
          if (server.serverMetadata && server.serverMetadata.issuer) {
            pdsUrl = server.serverMetadata.issuer;
            console.log('🔍 Using PDS from server metadata:', pdsUrl);
          } else {
            console.log('⚠️ No PDS URL found in server metadata, using default:', pdsUrl);
          }
          
          // Use the correct PDS endpoint: /xrpc/com.atproto.repo.getRecord
          const profileUrl = `${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${session.did}&collection=app.bsky.actor.profile&rkey=self`;
          console.log('🌐 Making server.dpopFetch request to PDS endpoint:', profileUrl);
          
          const profileResponse = await server.dpopFetch(profileUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            }
          });
          
          console.log('📡 PDS endpoint response status:', profileResponse.status);
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json() as any;
            console.log('👤 Profile data fetched via PDS endpoint:', profileData);
            
            if (profileData && profileData.value) {
              // Extract profile data from the PDS response structure
              const profileValue = profileData.value;
              handle = profileValue.handle || session.did;
              displayName = profileValue.displayName || '';
              description = profileValue.description || '';
              
              // Handle avatar - it's a complex object with ref and cid
              if (profileValue.avatar && profileValue.avatar.ref && profileValue.avatar.ref.$link) {
                const avatarCid = profileValue.avatar.ref.$link;
                avatar = `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${session.did}&cid=${avatarCid}`;
              } else {
                avatar = '';
              }
              
              console.log('✅ Profile data extracted from PDS response:', {
                handle,
                displayName,
                avatar: avatar ? 'present' : 'missing',
                description: description ? 'present' : 'missing'
              });
            }
          } else {
            console.log('⚠️ PDS endpoint failed with status:', profileResponse.status);
            const errorText = await profileResponse.text();
            console.log('📋 Error response:', errorText);
          }
        } else {
          console.log('⚠️ No server.dpopFetch method available');
        }
        
      } catch (pdsError) {
        console.log('⚠️ PDS endpoint error:', pdsError);
      }
      
    } catch (error) {
      console.log('⚠️ Error fetching profile data:', error);
    }
    
    const profile = {
      data: {
        handle: handle,
        displayName: displayName,
        avatar: avatar,
        description: description
      }
    };
    
    console.log('👤 Profile data created:', profile);
    
    // Create a simple session ID for our app
    const sessionId = Math.random().toString(36).substring(7);
    console.log('🎫 Generated session ID:', sessionId);
    
    // Store the session with our session ID
    const sessionData = {
      user: {
        did: session.did,
        handle: profile.data.handle,
        displayName: profile.data.displayName,
        avatar: profile.data.avatar,
        description: profile.data.description
      },
      oauthSession: session,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours absolute expiration
      lastActivity: Date.now(), // Track last activity
      maxIdleTime: 2 * 60 * 60 * 1000 // 2 hours of inactivity before requiring re-auth
    };
    console.log('💾 Storing session data:', sessionData);
    sessionStore.set(sessionId, sessionData);
    console.log('✅ Session stored successfully with ID:', sessionId);
    console.log('🔍 Session store size:', sessionStore.size);
    console.log('🔍 Session store keys:', Array.from(sessionStore.keys()));
    
    // Set session cookie for mobile Safari compatibility
    res.cookie('skyrc_session_id', sessionId, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: 'lax', // Allow cross-site requests
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Store session ID in localStorage and redirect back to main page
    console.log('🎉 OAuth flow completed successfully!');
    console.log('🔄 Sending success page with session ID:', sessionId);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Success</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #87CEEB 0%, #4682B4 100%);
            color: white;
          }
          .container { text-align: center; padding: 2rem; }
          .spinner { 
            width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3);
            border-top: 4px solid white; border-radius: 50%; animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>Authentication Successful!</h2>
          <p>Redirecting to chat...</p>
        </div>
        <script>
          console.log('🎉 OAuth success - storing session and redirecting');
          
          // Store session ID in localStorage (with fallback to cookies)
          try {
            localStorage.setItem('skyrc_session_id', '${sessionId}');
            console.log('💾 Session ID stored in localStorage');
          } catch (e) {
            console.warn('⚠️ localStorage not available, using cookies only');
          }
          
          // Ensure cookie is set (already set by server, but double-check)
          document.cookie = 'skyrc_session_id=${sessionId}; path=/; max-age=86400; samesite=lax';
          
          // Quick redirect for better UX
          setTimeout(() => {
            console.log('🔄 Redirecting to: ${redirectRoom ? `/${redirectRoom}` : '/'}');
            window.location.href = '${redirectRoom ? `/${redirectRoom}` : '/'}';
          }, 1000); // Reduced to 1 second for faster redirect
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Error</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
          }
          .container { text-align: center; padding: 2rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Authentication Failed</h2>
          <p>Please try again.</p>
        </div>
        <script>
          // Redirect back to main page on error
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        </script>
      </body>
      </html>
    `);
  }
});

// Get current session
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  console.log('🔍 Session lookup request for ID:', sessionId);
  
  const session = sessionStore.get(sessionId);
  console.log('📦 Session found:', !!session);
  console.log('🔍 Session store size:', sessionStore.size);
  console.log('🔍 Session store keys:', Array.from(sessionStore.keys()));
  console.log('🔍 Looking for session ID:', sessionId);
  
  if (!session) {
    console.log('❌ Session not found');
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Check if session is expired (absolute timeout)
  if (Date.now() > session.expiresAt) {
    console.log('⏰ Session expired (absolute timeout), deleting');
    sessionStore.delete(sessionId);
    return res.status(401).json({ error: 'Session expired' });
  }
  
  // Check if session is idle (inactivity timeout)
  const idleTime = Date.now() - (session.lastActivity || 0);
  if (idleTime > (session.maxIdleTime || 2 * 60 * 60 * 1000)) {
    console.log('⏰ Session expired (idle timeout), deleting');
    sessionStore.delete(sessionId);
    return res.status(401).json({ error: 'Session expired due to inactivity' });
  }
  
  // Update last activity on successful session check
  session.lastActivity = Date.now();
  sessionStore.set(sessionId, session);
  
  console.log('✅ Session valid, returning user data:', session.user);
  res.json({ user: session.user });
});

// Session refresh endpoint (for keeping session alive)
router.post('/session/:sessionId/refresh', (req, res) => {
  const { sessionId } = req.params;
  console.log('🔄 Session refresh request for ID:', sessionId);
  
  const session = sessionStore.get(sessionId);
  
  if (!session) {
    console.log('❌ Session not found for refresh');
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Check if session is expired (absolute timeout)
  if (Date.now() > session.expiresAt) {
    console.log('⏰ Session expired (absolute timeout), deleting');
    sessionStore.delete(sessionId);
    return res.status(401).json({ error: 'Session expired' });
  }
  
  // Check if session is idle (inactivity timeout)
  const idleTime = Date.now() - (session.lastActivity || 0);
  if (idleTime > (session.maxIdleTime || 2 * 60 * 60 * 1000)) {
    console.log('⏰ Session expired (idle timeout), deleting');
    sessionStore.delete(sessionId);
    return res.status(401).json({ error: 'Session expired due to inactivity' });
  }
  
  // Update last activity
  session.lastActivity = Date.now();
  sessionStore.set(sessionId, session);
  
  // Calculate time until expiration for client
  const timeUntilExpiration = Math.min(
    session.expiresAt - Date.now(),
    session.maxIdleTime - idleTime
  );
  
  console.log('✅ Session refreshed, time until expiration:', Math.round(timeUntilExpiration / 1000 / 60), 'minutes');
  res.json({ 
    success: true, 
    timeUntilExpiration,
    lastActivity: session.lastActivity
  });
});

// Logout
router.post('/logout/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  console.log('🚪 Logout request for session:', sessionId);
  
  const session = sessionStore.get(sessionId);
  
  if (session && session.oauthSession) {
    // Revoke the OAuth session
    session.oauthSession.signOut().catch(console.error);
  }
  
  sessionStore.delete(sessionId);
  console.log('✅ Session deleted successfully');
  res.json({ success: true });
});

// Clear all sessions (for testing)
router.post('/clear-sessions', (req, res) => {
  console.log('🧹 Clearing all sessions...');
  sessionStore.clear();
  res.json({ message: 'All sessions cleared' });
});

export { router as authRouter };