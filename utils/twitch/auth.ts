import { TokenRefresh, TokenValidation, Twitch } from '@/types/twitch';
export const getToken = async ({ twitch_secret, twitch_client }: TokenRefresh) => {
  const params = new URLSearchParams({
    client_id: twitch_client,
    client_secret: twitch_secret,
    grant_type: 'client_credentials'
  });

  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  const data = await response.json();
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