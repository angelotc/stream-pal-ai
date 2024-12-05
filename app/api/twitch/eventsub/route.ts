// app/api/twitch/eventsub/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const HMAC_PREFIX = 'sha256=';

function verifyTwitchSignature(request: Request, body: string) {
  const messageId = request.headers.get('Twitch-Eventsub-Message-Id');
  const timestamp = request.headers.get('Twitch-Eventsub-Message-Timestamp');
  const messageSignature = request.headers.get('Twitch-Eventsub-Message-Signature');
  
  if (!messageId || !timestamp || !messageSignature) return false;

  const message = messageId + timestamp + body;
  const hmac = HMAC_PREFIX + crypto
    .createHmac('sha256', process.env.TWITCH_WEBHOOK_SECRET!)
    .update(message)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(messageSignature)
  );
}

export async function POST(request: Request) {
  const body = await request.text(); // Get raw body for signature verification
  
  // Verify Twitch signature
  if (!verifyTwitchSignature(request, body)) {
    return new NextResponse('Invalid signature', { status: 403 });
  }

  const messageType = request.headers.get('Twitch-Eventsub-Message-Type');
  const data = JSON.parse(body);

  // Handle verification challenge
  if (messageType === 'webhook_callback_verification') {
    return new NextResponse(data.challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Handle revocation
  if (messageType === 'revocation') {
    console.log('Subscription revoked:', data.subscription);
    return new NextResponse(null, { status: 204 });
  }

  // Handle actual events
  if (messageType === 'notification') {
    try {
      if (data.subscription.type === 'stream.online') {
        // Handle stream online
        console.log('Stream went online:', data.event);
      } else if (data.subscription.type === 'stream.offline') {
        // Handle stream offline
        console.log('Stream went offline:', data.event);
      }
      
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error('Error processing notification:', error);
    }
  }
}