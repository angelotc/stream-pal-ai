import { TWITCH, RATE_LIMIT, TOKEN } from '@/config/constants';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function GET(request: Request) {
  // 1. Check required environment variables
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return NextResponse.json(
      { error: TOKEN.ERRORS.MISSING_CREDENTIALS },
      { status: 500 }
    );
  }

  // 2. Validate authentication
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json(
      { error: TOKEN.ERRORS.UNAUTHORIZED },
      { status: 401 }
    );
  }

  // 3. Rate limiting (simple in-memory implementation)
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const rateLimit = getRateLimit(clientIp, now);
  
  if (rateLimit.exceeded) {
    return NextResponse.json(
      { error: TOKEN.ERRORS.RATE_LIMIT_EXCEEDED },
      { 
        status: 429,
        headers: {
          'Retry-After': rateLimit.retryAfter.toString()
        }
      }
    );
  }

  try {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return NextResponse.json({ accessToken: cachedToken.value });
    }

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: TWITCH.SCOPES
      })
    });

    const data = await response.json();
    console.log('Token response:', data);
    if (!response.ok) {
      throw new Error(`Failed to get token: ${data.message}`);
    }

    const expiresInMs = (data.expires_in - TOKEN.BUFFER_TIME_SECONDS) * 1000;
    
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + expiresInMs
    };

    return NextResponse.json({ accessToken: cachedToken.value });
  } catch (error) {
    console.error('Token error:', error);
    return NextResponse.json(
      { error: TOKEN.ERRORS.FETCH_FAILED },
      { status: 500 }
    );
  }
}

// Simple in-memory rate limiting
const rateLimits = new Map<string, { count: number; timestamp: number }>();

function getRateLimit(clientIp: string, now: number) {
  const current = rateLimits.get(clientIp) || { count: 0, timestamp: now };
  
  if (now - current.timestamp > RATE_LIMIT.WINDOW_MS) {
    // Reset if window has passed
    current.count = 1;
    current.timestamp = now;
  } else {
    current.count++;
  }
  
  rateLimits.set(clientIp, current);
  
  return {
    exceeded: current.count > RATE_LIMIT.MAX_REQUESTS,
    retryAfter: Math.ceil((current.timestamp + RATE_LIMIT.WINDOW_MS - now) / 1000)
  };
} 