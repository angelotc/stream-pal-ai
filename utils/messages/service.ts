import { createClient } from '@/utils/supabase/client';
import { createAdminClient } from '@/utils/supabase/admin';
import { MessageType, ChatMessage } from '@/types/chat';
import { sendTwitchMessage } from '../twitch/chat';
import { CHAT } from '@/config/constants';

// Core message processing logic
export async function processMessage({
    text,
    type,
    userId,
    broadcasterId,
    chatterName,
    chatterId,
    isWebhook = false
}: {
    text: string;
    type: MessageType;
    userId: string;
    broadcasterId: string;
    chatterName: string;
    chatterId: string;
    isWebhook?: boolean;
}) {
    console.log('Processing message:', {
        text,
        type,
        userId,
        broadcasterId,
        chatterName,
        chatterId,
        isWebhook
    });

    if (!userId || !broadcasterId) {
        console.error('Missing required user data:', { userId, broadcasterId });
        return;
    }

    const timestamp = new Date().toISOString();
    const supabase = isWebhook ? createAdminClient() : createClient();
    // Save message
    await supabase
        .from('messages')
        .insert({
            text,
            type,
            user_id: userId,
            chatter_user_id: chatterId,
            chatter_user_name: chatterName,
            broadcaster_twitch_id: broadcasterId,
            timestamp,
            created_at: timestamp,
            responded_to: false
        });

    // Skip if message is from bot
    if (chatterId === process.env.TWITCH_BOT_USER_ID) {
        return;
    }

    // Check stream settings and cooldown
    const { data: streamSettings } = await supabase
        .from('stream_settings')
        .select('last_interaction, bot_prompt')
        .eq('platform_user_id', broadcasterId)
        .single();

    if (!streamSettings || !shouldInteract(streamSettings.last_interaction)) {
        return;
    }

    // Get recent messages
    const { data: recentMessages } = await supabase
        .from('messages')
        .select(`
            *,
            users!inner (
                twitch_user_id
            )
        `)
        .eq('broadcaster_twitch_id', broadcasterId)
        .order('created_at', { ascending: false })
        .limit(CHAT.MESSAGE_CONTEXT_SIZE);

    if (!recentMessages?.length) return;

    // Generate and send response
    const response = await generateAIResponse({
        messages: recentMessages,
        priorityMessage: {
            text,
            chatter_user_name: chatterName,
            type,
            broadcaster_twitch_id: broadcasterId,
            twitch_user_id: chatterId,
            created_at: timestamp
        }
    });

    if (response) {
        await sendTwitchMessage(broadcasterId, response);
        await supabase
            .from('stream_settings')
            .update({ last_interaction: timestamp })
            .eq('platform_user_id', broadcasterId);
    }
}

// Helper functions
async function generateAIResponse({ messages, priorityMessage }: { 
    messages: any[], 
    priorityMessage: ChatMessage 
}) {
    const formattedMessages = formatMessagesForAI(messages);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: formattedMessages, priorityMessage })
    });

    if (!response.ok) return null;
    const { content } = await response.json();
    return content;
}

export function formatMessagesForAI(messages: any[]) {
    return messages.map(m => ({
        text: m.text ?? '',
        type: m.type,
        chatter_user_name: m.chatter_user_name ?? 'anonymous',
        twitch_user_id: m.users?.twitch_user_id ?? 'unknown',
        created_at: m.created_at,
        broadcaster_twitch_id: m.broadcaster_twitch_id
    }));
}

export function shouldInteract(lastInteractionTime: string | null): boolean {
    if (!lastInteractionTime) return true;
    const now = Date.now();
    const lastInteraction = new Date(lastInteractionTime).getTime();
    return (now - lastInteraction) >= CHAT.INTERACTION_COOLDOWN;
} 