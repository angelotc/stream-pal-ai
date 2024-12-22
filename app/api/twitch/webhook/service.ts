import { createClient } from '@/utils/supabase/client';
import { adminClient, updateStreamStatus  } from '@/utils/supabase/admin';
import { MessageType, ChatMessage } from '@/types/chat';
import { formatMessagesForAI } from '@/utils/twitch/chat';
import { CHAT } from '@/config/constants';
import { subscribeToChatMessages, unsubscribeFromChatMessages } from '@/app/api/twitch/subscriptions/service';

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
    const supabase = isWebhook ? adminClient() : createClient();

    // Check stream settings and cooldown first
    const { data: streamSettings } = await supabase
        .from('stream_settings')
        .select('*')
        .eq('platform_user_id', broadcasterId)
        .single();

    if (!streamSettings) {
        console.error('Stream settings not found');
        return;
    }

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

    // Update last interaction time
    await supabase
        .from('stream_settings')
        .update({ last_interaction: timestamp })
        .eq('platform_user_id', broadcasterId);

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
    
    
    // Check cooldown
    const lastInteraction = streamSettings.last_interaction 
        ? new Date(streamSettings.last_interaction) 
        : new Date(0);
    const cooldownSeconds = streamSettings.bot_cooldown_seconds ?? 6;
    const now = new Date();
    
    if (now.getTime() - lastInteraction.getTime() < cooldownSeconds * 1000) {
        console.log('Bot on cooldown, skipping message');
        return;
    }

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
    }
}

// Helper functions
async function generateAIResponse({ messages, priorityMessage }: { 
    messages: any[], 
    priorityMessage: ChatMessage 
}) {
    const formattedMessages = formatMessagesForAI(messages);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/openai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: formattedMessages, priorityMessage })
    });

    if (!response.ok) return null;
    const { content } = await response.json();
    return content;
}



export async function sendTwitchMessage(broadcasterId: string, message: string) {
    try {
        const response = await fetch(process.env.NEXT_PUBLIC_SITE_URL + '/api/twitch/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                broadcasterId,
                message
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending Twitch message:', error);
        throw error;
    }
} 


export async function handleStreamStart(event: any) {
    const userData = await updateStreamStatus(
        event.broadcaster_user_id,
        true
    );
    
    const tokenResponse = await fetch(`${process.env.SITE_URL}/api/twitch/token`);
    const { accessToken } = await tokenResponse.json();
    
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
    
    const tokenResponse = await fetch(`${process.env.SITE_URL}/api/twitch/token`);
    const { accessToken } = await tokenResponse.json();

    await unsubscribeFromChatMessages(event.broadcaster_user_id, accessToken);
} 