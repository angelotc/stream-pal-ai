import { formatMessagesForAI, shouldInteract } from '@/utils/messages';
import { CHAT } from '@/config/constants';
import { insertChatMessage, getStreamSettings, getRecentMessagesWithUserData, updateLastInteraction } from '../supabase/admin';
import { sendTwitchMessage } from './chat';

export async function processNewChatMessage(event: any) {
    // Save the message
    await insertChatMessage({
        text: event.message.text,
        broadcaster_user_id: event.broadcaster_user_id,
        chatter_user_name: event.chatter_user_name,
        chatter_user_id: event.chatter_user_id
    });

    // Skip if message is from bot
    if (event.chatter_user_id === process.env.TWITCH_BOT_USER_ID) {
        return;
    }

    const streamSettings = await getStreamSettings(event.broadcaster_user_id);
    if (!streamSettings || !shouldInteract(streamSettings.last_interaction)) {
        return;
    }

    const recentMessages = await getRecentMessagesWithUserData(
        event.broadcaster_user_id, 
        CHAT.MESSAGE_CONTEXT_SIZE
    );

    if (!recentMessages?.length) return;

    await generateAndSendResponse(recentMessages, event);
}

async function generateAndSendResponse(recentMessages: any[], event: any) {
    const formattedMessages = formatMessagesForAI(recentMessages);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            messages: formattedMessages,
            priorityMessage: {
                text: event.message.text,
                chatter_user_name: event.chatter_user_name,
                type: 'twitch',
                broadcaster_twitch_id: event.broadcaster_user_id
            }
        })
    });

    if (response.ok) {
        const { content } = await response.json();
        await sendTwitchMessage(event.broadcaster_user_id, content);
        await updateLastInteraction(event.broadcaster_user_id);
    }
} 