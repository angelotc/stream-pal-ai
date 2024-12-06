import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Message type constants
const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
const MESSAGE_TYPE_NOTIFICATION = 'notification';
const MESSAGE_TYPE_REVOCATION = 'revocation';

export async function POST(request: Request) {
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
    switch(messageType) {
      case MESSAGE_TYPE_VERIFICATION:
        // Return challenge for subscription verification
        return new NextResponse(data.challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });

      case MESSAGE_TYPE_NOTIFICATION:
        // Handle the event notification
        switch (data.subscription.type) {
          case 'stream.online':
            console.log('Stream started:', data.event);
            // TODO: Add your stream start logic here
            break;
          case 'stream.offline':
            console.log('Stream ended:', data.event);
            // TODO: Add your stream end logic here
            break;
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