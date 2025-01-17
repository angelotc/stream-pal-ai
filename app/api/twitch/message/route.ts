import { NextResponse } from 'next/server';
import { calculateMessageDelay } from '@/utils/message-timing';

export async function POST(request: Request) {
  try {
    const { broadcasterId, message } = await request.json();
    console.log('sending message...', message);
    // Calculate delay based on message length
    const delay = calculateMessageDelay(message);
    console.log('delay:', delay);
    // Wait for the calculated delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Get fresh token with bot permissions
    const tokenResponse = await fetch(`${process.env.SITE_URL}/api/twitch/token`);
    const { accessToken } = await tokenResponse.json();
    const response = await fetch(`https://api.twitch.tv/helix/chat/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcaster_id: broadcasterId,
        message: message,
        sender_id: process.env.TWITCH_BOT_USER_ID!
      })
    });
    console.log('response:', response);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send message: ${error.message}`);
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('Error sending Twitch message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 