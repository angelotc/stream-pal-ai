export async function manageTwitchSubscriptions(userId: string, botEnabled: boolean, accessToken: string) {
    const TWITCH_API = 'https://api.twitch.tv/helix/eventsub/subscriptions';
    const CALLBACK_URL = `${process.env.SITE_URL}/api/twitch/webhook`;
    console.log("Using callback URL:", CALLBACK_URL);
    console.log ("botEnabled", botEnabled);
    console.log ("accessToken", accessToken);
    console.log ("userId", userId);
    console.log("Twitch API", TWITCH_API);
    const headers = {
      'Client-ID': process.env.TWITCH_CLIENT_ID!,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
  
    try {
        if (botEnabled) {
            // Subscribe to stream.online
            const onlineResponse = await fetch(TWITCH_API, {
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
            const onlineData = await onlineResponse.json();
            console.log("Online subscription response data:", onlineData);
            if (!onlineResponse.ok) {
                throw new Error(`Failed to subscribe to stream.online: ${onlineResponse.statusText}`);
            }

            // Subscribe to stream.offline
            const offlineResponse = await fetch(TWITCH_API, {
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
            const offlineData = await offlineResponse.json();
            console.log("Offline subscription response data:", offlineData);
            if (!offlineResponse.ok) {
                throw new Error(`Failed to subscribe to stream.offline: ${offlineResponse.statusText}`);
            }
        } else {
            // Get existing subscriptions
            const response = await fetch(`${TWITCH_API}?user_id=${userId}`, {
                headers
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch subscriptions: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("deleting subscriptions", data);
            
            // Delete each subscription
            if (data.data) {
                for (const sub of data.data) {
                    const deleteResponse = await fetch(`${TWITCH_API}?id=${sub.id}`, {
                        method: 'DELETE',
                        headers
                    });

                    if (!deleteResponse.ok) {
                        throw new Error(`Failed to delete subscription: ${deleteResponse.statusText}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Twitch API error:', error);
        throw error;
    }
} 

