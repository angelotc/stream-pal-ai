import { Twitch, TwitchSubscription } from '@/types/twitch';
export async function subscribeToChatMessages(broadcasterId: string, user_id: string, accessToken: string) {
    console.log('Subscribing to chat messages for broadcaster:', broadcasterId);
    
    const subscriptionData = {
        type: 'channel.chat.message',
        version: '1',
        condition: { 
            broadcaster_user_id: broadcasterId,
            user_id: user_id
        },
        transport: {
            method: 'webhook',
            callback: `${process.env.SITE_URL}/api/twitch/webhook`,
            secret: process.env.TWITCH_WEBHOOK_SECRET
        }
    };
    
    console.log('Subscription request data:', JSON.stringify(subscriptionData, null, 2));
    
    try {
        const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method: 'POST',
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID!,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscriptionData)
        });

        const responseData = await response.json();
        
        if (!response.ok) {
            console.error('Subscription error details:', {
                status: response.status,
                statusText: response.statusText,
                response: responseData
            });
            throw new Error(`Failed to create chat subscription: ${response.statusText} - ${JSON.stringify(responseData)}`);
        }

        console.log('Chat subscription created:', responseData);
        return responseData;
    } catch (error) {
        console.error('Subscription request failed:', error);
        throw error;
    }
}

export async function unsubscribeFromChatMessages(broadcasterId: string, accessToken: string) {
    console.log('Unsubscribing from chat messages for broadcaster:', broadcasterId);
    
    // Get existing subscriptions
    const subsResponse = await fetch(
        `https://api.twitch.tv/helix/eventsub/subscriptions?type=channel.chat.message`,
        {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID!,
                'Authorization': `Bearer ${accessToken}`
            }
        }
    );

    const subsData = await subsResponse.json();
    console.log('Found chat subscriptions:', subsData);

    // Delete relevant subscriptions
    for (const sub of subsData.data as TwitchSubscription[]) {
        if (sub.condition.broadcaster_user_id === broadcasterId) {
            const deleteResponse = await fetch(
                `https://api.twitch.tv/helix/eventsub/subscriptions?id=${sub.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Client-ID': process.env.TWITCH_CLIENT_ID!,
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            if (deleteResponse.ok) {
                console.log(`Deleted chat subscription: ${sub.id}`);
            } else {
                throw new Error(`Failed to delete chat subscription: ${sub.id}`);
            }
        }
    }
} 

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
        // First check existing subscriptions
        const existingResponse = await fetch(`${TWITCH_API}?user_id=${userId}`, {
            headers
        });
        const existingData = await existingResponse.json();

        if (botEnabled) {
            // Check if we already have active subscriptions
            const hasOnlineSub = existingData.data?.some(
                (sub: any) => sub.type === 'stream.online' && 
                             sub.condition.broadcaster_user_id === userId &&
                             sub.status === 'enabled'
            );
            const hasOfflineSub = existingData.data?.some(
                (sub: any) => sub.type === 'stream.offline' && 
                             sub.condition.broadcaster_user_id === userId &&
                             sub.status === 'enabled'
            );

            // If both subs exist and are enabled, we're done
            if (hasOnlineSub && hasOfflineSub) {
                return {
                    success: true,
                    status: 'active',
                    message: 'Subscriptions already active'
                };
            }

            // Create missing subscriptions
            const subscriptionsToCreate = [];
            if (!hasOnlineSub) {
                subscriptionsToCreate.push({
                    type: 'stream.online',
                    version: '1',
                    condition: { broadcaster_user_id: userId },
                    transport: {
                        method: 'webhook',
                        callback: CALLBACK_URL,
                        secret: process.env.TWITCH_WEBHOOK_SECRET
                    }
                });
            }
            if (!hasOfflineSub) {
                subscriptionsToCreate.push({
                    type: 'stream.offline',
                    version: '1',
                    condition: { broadcaster_user_id: userId },
                    transport: {
                        method: 'webhook',
                        callback: CALLBACK_URL,
                        secret: process.env.TWITCH_WEBHOOK_SECRET
                    }
                });
            }

            // Create any missing subscriptions
            for (const subData of subscriptionsToCreate) {
                try {
                    const response = await fetch(TWITCH_API, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(subData)
                    });
                    const data = await response.json();

                    // 409 means it exists, which is fine
                    if (!response.ok && response.status !== 409) {
                        throw new Error(`Failed to create ${subData.type} subscription: ${JSON.stringify(data)}`);
                    }
                } catch (error: any) {
                    if (error?.status !== 409) {
                        throw error;
                    }
                }
            }

            return {
                success: true,
                status: 'created',
                message: 'Subscriptions created successfully'
            };

        } else {
            // Delete existing subscriptions
            const deletePromises = existingData.data
                .filter((sub: any) => 
                    sub.condition.broadcaster_user_id === userId &&
                    (sub.type === 'stream.online' || sub.type === 'stream.offline')
                )
                .map(async (sub: any) => {
                    const deleteResponse = await fetch(`${TWITCH_API}?id=${sub.id}`, {
                        method: 'DELETE',
                        headers
                    });
                    return deleteResponse;
                });

            await Promise.all(deletePromises);

            return {
                success: true,
                status: 'disabled',
                message: 'Subscriptions removed successfully'
            };
        }
    } catch (error: any) {
        console.error('Twitch API error:', error);
        return {
            success: false,
            status: error.status || 500,
            message: error.message || 'Failed to manage subscriptions'
        };
    }
} 

export async function getStreamerData({ client_id, access_token, twitch_username }: Twitch) {
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
}

