import { TWITCH, RATE_LIMIT, TOKEN } from '@/config/constants';
import { NextResponse } from 'next/server';

let cachedToken: { value: string; expiresAt: number } | null = null;

async function validateTwitchToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.log('Token validation failed:', await response.json());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

export async function GET(request: Request) {
  // 1. Check required environment variables
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return NextResponse.json(
      { error: TOKEN.ERRORS.MISSING_CREDENTIALS },
      { status: 500 }
    );
  }

  // 2. Rate limiting
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
    // 3. Check cached token and validate it
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      const isValid = await validateTwitchToken(cachedToken.value);
      if (isValid) {
        return NextResponse.json({ accessToken: cachedToken.value });
      }
      cachedToken = null;
    }

    // 4. Get new token
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
    if (!response.ok) {
      throw new Error(`Failed to get token: ${data.message}`);
    }

    // 5. Validate new token before caching
    const isValid = await validateTwitchToken(data.access_token);
    if (!isValid) {
      throw new Error('New token validation failed');
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

// Rate limiting implementation
const rateLimits = new Map<string, { count: number; timestamp: number }>();

function getRateLimit(clientIp: string, now: number) {
  const current = rateLimits.get(clientIp) || { count: 0, timestamp: now };
  
  if (now - current.timestamp > RATE_LIMIT.WINDOW_MS) {
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