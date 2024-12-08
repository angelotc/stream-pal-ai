export interface TokenRefresh {
  twitch_secret: string;
  twitch_client: string;
}

export interface TokenValidation {
  twitchToken: string;
}

export interface Twitch {
  client_id: string;
  access_token: string;
  twitch_username: string;
}
