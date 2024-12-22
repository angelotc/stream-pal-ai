import { TWITCH } from '@/config/constants';
import { NextResponse } from 'next/server';

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function GET() {
  try {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return NextResponse.json({ accessToken: cachedToken.value });
    }

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID!,
        client_secret: process.env.TWITCH_CLIENT_SECRET!,
        grant_type: 'client_credentials',
        scope: TWITCH.SCOPES
      })
    });

    const data = await response.json();
    console.log('Token response:', data);
    if (!response.ok) {
      throw new Error(`Failed to get token: ${data.message}`);
    }

    const bufferTimeInSeconds = 60; // 1 minute buffer
    const expiresInMs = (data.expires_in - bufferTimeInSeconds) * 1000;
    
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + expiresInMs
    };

    return NextResponse.json({ accessToken: cachedToken.value });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get token' }, { status: 500 });
  }
} 