import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getToken } from '@/utils/twitch/auth';
import { subscribeToChatMessages, unsubscribeFromChatMessages } from '@/utils/twitch/subscriptions';
import { 
    insertChatMessage, 
    getStreamSettings, 
    getRecentMessagesWithUserData,
    updateLastInteraction,
    updateStreamStatus
} from '@/utils/supabase/admin';
import { formatMessagesForAI, shouldInteract } from '@/utils/messages';
import { CHAT } from '@/config/constants';

// Message type constants
const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
const MESSAGE_TYPE_NOTIFICATION = 'notification';
const MESSAGE_TYPE_REVOCATION = 'revocation';

export async function POST(request: Request) {
    console.log("Webhook endpoint hit!");
    console.log("Request headers:", Object.fromEntries(request.headers.entries()));

    try {
        // Get all required headers
        const messageId = request.headers.get('Twitch-Eventsub-Message-Id');
        const timestamp = request.headers.get('Twitch-Eventsub-Message-Timestamp');
        const messageType = request.headers.get('Twitch-Eventsub-Message-Type');
        const signature = request.headers.get('Twitch-Eventsub-Message-Signature');

        console.log('Received webhook:', { messageId, timestamp, messageType });

        // Verify all required headers are present
        if (!messageId || !timestamp || !messageType || !signature) {
            console.log('Missing headers:', { messageId, timestamp, messageType, signature });
            return new NextResponse('Missing required headers', { status: 400 });
        }

        // Get raw body as text for signature verification
        const body = await request.text();
        console.log('Webhook body:', body);

        // Verify signature
        const hmacMessage = messageId + timestamp + body;
        const hmac = 'sha256=' + crypto.createHmac('sha256', process.env.TWITCH_WEBHOOK_SECRET!)
            .update(hmacMessage)
            .digest('hex');

        console.log('Signature verification:', {
            received: signature,
            calculated: hmac,
            matches: hmac === signature
        });

        if (hmac !== signature) {
            console.log('403: Signatures did not match');
            return new NextResponse('Invalid signature', { status: 403 });
        }

        // Parse the JSON body
        const data = JSON.parse(body);
        console.log('Parsed data:', data);

        // Handle different message types
        switch (messageType) {
            case MESSAGE_TYPE_VERIFICATION:
                // Return challenge for subscription verification
                return new NextResponse(data.challenge, {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' }
                });

            case MESSAGE_TYPE_NOTIFICATION:
                console.log('Received notification type:', data.subscription.type);
                console.log('Full notification data:', data);

                // Handle the event notification
                switch (data.subscription.type) {
                    case 'channel.chat.message':
                        console.log('Chat message received:', data.event);
                        try {
                            // Always save the message
                            await insertChatMessage({
                                text: data.event.message.text,
                                broadcaster_user_id: data.event.broadcaster_user_id,
                                chatter_user_name: data.event.chatter_user_name,
                                chatter_user_id: data.event.chatter_user_id
                            });

                            // Only generate AI response if not from bot
                            if (data.event.chatter_user_id !== process.env.TWITCH_BOT_USER_ID) {
                                const streamSettings = await getStreamSettings(data.event.broadcaster_user_id);

                                if (streamSettings && shouldInteract(streamSettings.last_interaction)) {
                                    const recentMessages = await getRecentMessagesWithUserData(
                                        data.event.broadcaster_user_id, 
                                        CHAT.MESSAGE_CONTEXT_SIZE
                                    );

                                    if (recentMessages) {
                                        // Find unanswered messages
                                        const unansweredMessages = recentMessages.filter(m => 
                                            !m.responded_to && 
                                            m.text.trim().length > 0 &&
                                            m.chatter_user_id !== process.env.TWITCH_BOT_USER_ID
                                        );

                                        if (unansweredMessages.length > 0) {
                                            const formattedMessages = formatMessagesForAI(recentMessages);

                                            // Generate and send AI response
                                            const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/chat`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ 
                                                    messages: formattedMessages,
                                                    priorityMessage: {
                                                        text: data.event.message.text,
                                                        chatter_user_name: data.event.chatter_user_name,
                                                        type: 'twitch',
                                                        broadcaster_twitch_id: data.event.broadcaster_user_id
                                                    }
                                                })
                                            });

                                            if (response.ok) {
                                                const { content } = await response.json();
                                                await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/twitch/message`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        broadcasterId: data.event.broadcaster_user_id,
                                                        message: content
                                                    })
                                                });

                                                await updateLastInteraction(data.event.broadcaster_user_id);
                                            }
                                        }
                                    }
                                }
                            }

                            return new NextResponse(null, { status: 204 });
                        } catch (error) {
                            console.error('Failed to process chat message:', error);
                            return new NextResponse('Internal Server Error', { status: 500 });
                        }
                        break;
                    case 'stream.online':
                        console.log('Stream started:', data.event);
                        try {
                            const userData = await updateStreamStatus(
                                data.event.broadcaster_user_id,
                                true
                            );
                            
                            const accessToken = await getToken({
                                twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
                                twitch_client: process.env.TWITCH_CLIENT_ID!
                            });
                            await subscribeToChatMessages(data.event.broadcaster_user_id, process.env.TWITCH_BOT_USER_ID!, accessToken);
                            
                            return new NextResponse(null, { status: 204 });
                        } catch (error) {
                            console.error('Failed to handle stream start:', error);
                            return new NextResponse('Internal Server Error', { status: 500 });
                        }
                        break;
                    case 'stream.offline':
                        console.log('Stream ended:', data.event);
                        try {
                            const userData = await updateStreamStatus(
                                data.event.broadcaster_user_id,
                                false
                            );
                            
                            const accessToken = await getToken({
                                twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
                                twitch_client: process.env.TWITCH_CLIENT_ID!
                            });
                            await unsubscribeFromChatMessages(data.event.broadcaster_user_id, accessToken);
                            
                            return new NextResponse(null, { status: 204 });
                        } catch (error) {
                            console.error('Failed to handle stream end:', error);
                            return new NextResponse('Internal Server Error', { status: 500 });
                        }
                        break;
                    default:
                        console.log('Unknown event type:', data.subscription.type);
                }
                // Return 204 for successful receipt
                return new NextResponse(null, { status: 204 });

            case MESSAGE_TYPE_REVOCATION:
                // Handle subscription revocation
                console.log(`Subscription revoked! Reason: ${data.subscription.status}`);
                console.log('Subscription:', data.subscription);
                return new NextResponse(null, { status: 204 });

            default:
                console.log(`Unknown message type: ${messageType}`);
                return new NextResponse(null, { status: 204 });
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 