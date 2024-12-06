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
    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'channel.chat.message',
            version: '1',
            condition: { broadcaster_user_id: broadcasterId },
            transport: {
                method: 'webhook',
                callback: `${process.env.SITE_URL}/api/twitch/webhook`,
                secret: process.env.TWITCH_WEBHOOK_SECRET
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to create chat subscription: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Chat subscription created:', data);
    return data;
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