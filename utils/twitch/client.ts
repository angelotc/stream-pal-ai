// utils/twitch.ts
export async function manageTwitchSubscriptions(userId: string, botEnabled: boolean) {
    const TWITCH_API = 'https://api.twitch.tv/helix/eventsub/subscriptions';
    const CALLBACK_URL = `${process.env.NEXT_PUBLIC_SITE_URL}/api/twitch/eventsub`;
  
    const headers = {
      'Client-ID': process.env.TWITCH_CLIENT_ID!,
      'Authorization': `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    };
  
    if (botEnabled) {
      // Subscribe to stream.online
      await fetch(TWITCH_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'stream.online',
          version: '1',
          condition: { broadcaster_user_id: userId },
          transport: {
            method: 'webhook',
            callback: CALLBACK_URL,
            secret: process.env.TWITCH_WEBHOOK_SECRET
          }
        })
      });
  
      // Subscribe to stream.offline
      await fetch(TWITCH_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'stream.offline',
          version: '1',
          condition: { broadcaster_user_id: userId },
          transport: {
            method: 'webhook',
            callback: CALLBACK_URL,
            secret: process.env.TWITCH_WEBHOOK_SECRET
          }
        })
      });
    } else {
      // Delete all subscriptions for this user
      const response = await fetch(`${TWITCH_API}?user_id=${userId}`, {
        headers
      });
      const data = await response.json();
      
      // Delete each subscription
      for (const sub of data.data) {
        await fetch(`${TWITCH_API}?id=${sub.id}`, {
          method: 'DELETE',
          headers
        });
      }
    }
  }