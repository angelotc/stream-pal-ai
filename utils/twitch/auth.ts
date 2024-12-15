import { TokenRefresh, TokenValidation, Twitch } from '@/types/twitch';

export const TWITCH_SCOPES = 'channel:read:subscriptions channel:manage:broadcast chat:read chat:edit user:write:chat user:read:chat';

export const getToken = async () => {
  const response = await fetch('/api/twitch/token');
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to get token: ${data.error}`);
  }
  
  return data.token;
};

export const validateToken = async ({ twitchToken }: TokenValidation) => {
  // TODO: figure out how to use this
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