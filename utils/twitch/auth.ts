import { TokenRefresh, TokenValidation, Twitch } from '@/types/twitch';

export const TWITCH_SCOPES = 'channel:read:subscriptions channel:manage:broadcast chat:read chat:edit user:write:chat user:read:chat';


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

