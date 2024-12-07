import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getToken } from '@/utils/twitch/auth';
import { subscribeToChatMessages, unsubscribeFromChatMessages } from '@/utils/twitch/subscriptions';
import { createClient } from '@/utils/supabase/server';

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
                        const supabase = createClient();

                        try {
                            const { error } = await supabase
                                .from('messages')
                                .insert({
                                    text: data.event.message.text,
                                    type: 'twitch',
                                    user_id: data.event.broadcaster_user_id,
                                    chatter_user_name: data.event.chatter_user_name,
                                    broadcaster_id: data.event.broadcaster_user_id,
                                    timestamp: new Date().toISOString()
                                });

                            if (error) {
                                console.error('Error saving twitch message:', error);
                                return new NextResponse('Error saving message', { status: 500 });
                            }

                            return new NextResponse(null, { status: 204 });
                        } catch (error) {
                            console.error('Failed to save twitch message:', error);
                            return new NextResponse('Internal Server Error', { status: 500 });
                        }
                        break;
                    case 'stream.online':
                        console.log('Stream started:', data.event);
                        try {
                            const supabase = createClient();
                            const platform = 'twitch'; // Specify the platform, e.g., 'twitch'

                            // Upsert is_live status in stream_settings table
                            const { data: updateData, error: updateError } = await supabase
                                .from('stream_settings')
                                .upsert(
                                    { user_id: data.event.broadcaster_user_id, platform, is_live: true },
                                    { onConflict:'user_id, platform' }
                                );

                            if (updateError) {
                                console.error('Error updating is_live status:', updateError);
                            } else {
                                console.log('is_live status updated successfully:', updateData);
                            }

                            const accessToken = await getToken({
                                twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
                                twitch_client: process.env.TWITCH_CLIENT_ID!
                            });
                            // Subscribe to Twitch chat messages
                            await subscribeToChatMessages(data.event.broadcaster_user_id, process.env.TWITCH_BOT_USER_ID!, accessToken);
                        } catch (error) {
                            console.error('Failed to handle stream start:', error);
                        }
                        return new NextResponse(null, { status: 204 });

                    case 'stream.offline':
                        console.log('Stream ended:', data.event);
                        try {
                            const supabase = createClient();
                            const platform = 'twitch'; // Specify the platform, e.g., 'twitch'

                            // Upsert is_live status in stream_settings table
                            const { data: updateData, error: updateError } = await supabase
                                .from('stream_settings')
                                .upsert(
                                    { user_id: data.event.broadcaster_user_id, platform, is_live: false },
                                    { onConflict: :'user_id, platform' }
                                );

                            if (updateError) {
                                console.error('Error updating is_live status:', updateError);
                            } else {
                                console.log('is_live status updated successfully:', updateData);
                            }

                            const accessToken = await getToken({
                                twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
                                twitch_client: process.env.TWITCH_CLIENT_ID!
                            });
                            // Unsubscribe from Twitch chat messages
                            await unsubscribeFromChatMessages(data.event.broadcaster_user_id, accessToken);
                        } catch (error) {
                            console.error('Failed to handle stream end:', error);
                        }
                        return new NextResponse(null, { status: 204 });
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