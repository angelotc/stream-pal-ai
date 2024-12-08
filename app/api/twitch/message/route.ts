import { NextResponse } from 'next/server';
import { getToken } from '@/utils/twitch/auth';

export async function POST(request: Request) {
  try {
    const { broadcasterId, message } = await request.json();
    
    // Get fresh token with bot permissions
    const accessToken = await getToken({
      twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
      twitch_client: process.env.TWITCH_CLIENT_ID!
    });

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