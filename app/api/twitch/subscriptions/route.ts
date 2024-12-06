import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { manageTwitchSubscriptions } from '@/utils/twitch/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { botEnabled } = await request.json();
    
    await manageTwitchSubscriptions(user.id, botEnabled);
    
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error managing Twitch subscriptions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 