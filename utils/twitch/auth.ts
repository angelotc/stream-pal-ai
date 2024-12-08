import { TokenRefresh, TokenValidation, Twitch } from '@/types/twitch';

export const TWITCH_SCOPES = 'channel:read:subscriptions channel:manage:broadcast chat:read chat:edit';

let cachedToken: { value: string; expiresAt: number } | null = null;

export const getToken = async ({ twitch_secret, twitch_client }: TokenRefresh) => {
  // If we're on the client side, fetch from our API route
  if (typeof window !== 'undefined') {
    const response = await fetch('/api/twitch/token');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Failed to get token: ${data.error}`);
    }
    
    return data.token;
  }
  
  // Server-side token logic (existing code)
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    console.log('Using cached token');
    return cachedToken.value;
  }

  console.log('Getting fresh token');
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: twitch_client,
      client_secret: twitch_secret,
      grant_type: 'client_credentials',
      scope: TWITCH_SCOPES
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to get token: ${data.message}`);
  }

  // Cache the new token with expiry (subtract 60 seconds for safety margin)
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000
  };

  return data.access_token;
};

export const validateToken = async ({ twitchToken }: TokenValidation) => {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        Authorization: `Bearer ${twitchToken}`
      }
    });
    if (response.status === 401) {
      return false;
    }
    return response.status === 200;
  } catch (error) {
    throw error;
  }
};

export const getStreamerData = async ({ client_id, access_token, twitch_username }: Twitch) => {
  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/users?login=${twitch_username}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Client-Id': client_id,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 401) {
      console.debug('Refresh Token');
      return;
    }

    const data = await response.json();
    return data.data[0];
  } catch (error) {
    throw error;
  }
}; 