import { getToken } from '@/utils/twitch/auth';

export async function sendTwitchMessage(broadcasterId: string, message: string) {
    try {
        // Get access token
        const accessToken = await getToken({
            twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
            twitch_client: process.env.TWITCH_CLIENT_ID!
        });

        console.log('accessToken', accessToken);
        const response = await fetch(`https://api.twitch.tv/helix/chat/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Client-Id': process.env.TWITCH_CLIENT_ID!,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                broadcaster_id: broadcasterId,
                message: message,
                sender_id: process.env.TWITCH_BOT_USER_ID!,
                // Optional: reply to a specific message
                // reply_parent_message_id: 'message-id'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to send message: ${error.message}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending Twitch message:', error);
        throw error;
    }
} 