import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getToken } from '@/utils/twitch/auth';

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
                        break;
                    case 'stream.online':
                        console.log('Stream started:', data.event);
                        // Get fresh token
                        try {
                            const accessToken = await getToken({
                                twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
                                twitch_client: process.env.TWITCH_CLIENT_ID!
                            });

                            const chatResponse = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
                                method: 'POST',
                                headers: {
                                    'Client-ID': process.env.TWITCH_CLIENT_ID!,
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    type: 'channel.chat.message',
                                    version: '1',
                                    condition: { broadcaster_user_id: data.event.broadcaster_user_id },
                                    transport: {
                                        method: 'webhook',
                                        callback: `${process.env.SITE_URL}/api/twitch/webhook`,
                                        secret: process.env.TWITCH_WEBHOOK_SECRET
                                    }
                                })
                            });
                            const chatData = await chatResponse.json();
                            console.log('Chat subscription created:', chatData);
                        } catch (error) {
                            console.error('Failed to subscribe to chat:', error);
                        }
                        break;

                    case 'stream.offline':
                        console.log('Stream ended:', data.event);
                        try {
                            // Get fresh token
                            const accessToken = await getToken({
                                twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
                                twitch_client: process.env.TWITCH_CLIENT_ID!
                            });

                            // Get existing subscriptions
                            const subsResponse = await fetch(
                                `https://api.twitch.tv/helix/eventsub/subscriptions?type=channel.chat.message&status=enabled`,
                                {
                                    headers: {
                                        'Client-ID': process.env.TWITCH_CLIENT_ID!,
                                        'Authorization': `Bearer ${accessToken}`
                                    }
                                }
                            );

                            const subsData = await subsResponse.json();
                            console.log('Found chat subscriptions:', subsData);

                            // Delete chat subscriptions for this broadcaster
                            for (const sub of subsData.data) {
                                if (sub.condition.broadcaster_user_id === data.event.broadcaster_user_id) {
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
                                        console.error(`Failed to delete chat subscription: ${sub.id}`);
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Failed to unsubscribe from chat:', error);
                        } finally {
                            return new NextResponse(null, { status: 204 });
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