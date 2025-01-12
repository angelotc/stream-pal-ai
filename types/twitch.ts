export interface TokenRefresh {
  twitch_secret: string;
  twitch_client: string;
}

export interface TokenValidation {
  twitchToken: string;
}

export interface TwitchSubscription {
  id: string;
  condition: {
      broadcaster_user_id: string;
  };
  type: string;
  status: string;
}
