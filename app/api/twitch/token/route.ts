import { getToken } from '../../../../utils/twitch/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = await getToken({
      twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
      twitch_client: process.env.TWITCH_CLIENT_ID!
    });
    
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error getting token:', error);
    return NextResponse.json(
      { error: 'Failed to get token' },
      { status: 500 }
    );
  }
} 