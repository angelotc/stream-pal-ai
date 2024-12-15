import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/utils/twitch/webhook-verification';
import { handleStreamStart, handleStreamEnd } from '@/app/api/twitch/handlers/service';
import { processMessage } from './service';

export async function POST(request: Request) {
    console.log("Webhook endpoint hit!");
    console.log("Request headers:", Object.fromEntries(request.headers.entries()));

    try {
        const messageId = request.headers.get('Twitch-Eventsub-Message-Id');
        const timestamp = request.headers.get('Twitch-Eventsub-Message-Timestamp');
        const messageType = request.headers.get('Twitch-Eventsub-Message-Type');
        const signature = request.headers.get('Twitch-Eventsub-Message-Signature');
        
        const body = await request.text();
        
        if (!verifyWebhookSignature(messageId, timestamp, signature, body)) {
            return new NextResponse('Invalid signature', { status: 403 });
        }

        const data = JSON.parse(body);

        switch (messageType) {
            case 'webhook_callback_verification':
                return new NextResponse(data.challenge, {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' }
                });

            case 'notification':
                switch (data.subscription.type) {
                    case 'channel.chat.message':
                        await processMessage({
                            text: data.event.message.text,
                            type: 'twitch',
                            userId: data.event.broadcaster_user_id,
                            broadcasterId: data.event.broadcaster_user_id,
                            chatterName: data.event.chatter_user_name,
                            chatterId: data.event.chatter_user_id,
                            isWebhook: true
                        });
                        break;
                    case 'stream.online':
                        await handleStreamStart(data.event);
                        break;
                    case 'stream.offline':
                        await handleStreamEnd(data.event);
                        break;
                }
                return new NextResponse(null, { status: 204 });

            default:
                return new NextResponse(null, { status: 204 });
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 