import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Get client ID and secret from command line arguments
const clientId = process.argv[2];
const clientSecret = process.argv[3];

if (!clientId || !clientSecret) {
  console.error('Please provide both client ID and secret as arguments');
  console.error('Usage: node scripts/check-twitch-scopes.js <client-id> <client-secret>');
  process.exit(1);
}

async function checkTwitchScopes() {
  console.log('Checking Twitch scopes for client ID:', clientId);

  try {
    // First get an OAuth token
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get token: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Then validate the token to get scopes
    const validateResponse = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `OAuth ${accessToken}`
      }
    });

    if (!validateResponse.ok) {
      throw new Error(`Failed to validate token: ${validateResponse.statusText}`);
    }

    const validateData = await validateResponse.json();

    console.log('\nToken Information:');
    console.log('----------------');
    console.log('Client ID:', validateData.client_id);
    console.log('Scopes:', validateData.scopes.join(', ') || 'No scopes found');
    console.log('Expires In:', validateData.expires_in, 'seconds');
    
    // Additional user info if available
    if (validateData.user_id) {
      console.log('User ID:', validateData.user_id);
      console.log('Login:', validateData.login);
    }

    process.exit(0);
  } catch (error) {
    console.error('Failed to check scopes:', error);
    process.exit(1);
  }
}

// Run the check
checkTwitchScopes().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 