import { getToken } from '@/utils/twitch/auth';
import { subscribeToChatMessages, unsubscribeFromChatMessages } from '@/utils/twitch/subscriptions';
import { updateStreamStatus } from '@/utils/supabase/admin';

export async function handleStreamStart(event: any) {
    const userData = await updateStreamStatus(
        event.broadcaster_user_id,
        true
    );
    
    const accessToken = await getToken({
        twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
        twitch_client: process.env.TWITCH_CLIENT_ID!
    });
    
    await subscribeToChatMessages(
        event.broadcaster_user_id, 
        process.env.TWITCH_BOT_USER_ID!, 
        accessToken
    );
}

export async function handleStreamEnd(event: any) {
    const userData = await updateStreamStatus(
        event.broadcaster_user_id,
        false
    );
    
    const accessToken = await getToken({
        twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
        twitch_client: process.env.TWITCH_CLIENT_ID!
    });
    
    await unsubscribeFromChatMessages(event.broadcaster_user_id, accessToken);
} 