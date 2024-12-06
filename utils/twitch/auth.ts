interface TokenRefresh {
  twitch_secret: string;
  twitch_client: string;
}

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