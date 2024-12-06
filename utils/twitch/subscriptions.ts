interface TwitchSubscription {
    id: string;
    condition: {
        broadcaster_user_id: string;
    };
    type: string;
    status: string;
}

export async function subscribeToChatMessages(broadcasterId: string, accessToken: string) {
    console.log('Subscribing to chat messages for broadcaster:', broadcasterId);
    
    const subscriptionData = {
        type: 'channel.chat.message',
        version: '1',
        condition: { broadcaster_user_id: broadcasterId },
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