import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { manageTwitchSubscriptions  } from '@/app/api/twitch/subscriptions/service';


export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const { botEnabled } = await request.json();
    const tokenResponse = await fetch(`${process.env.SITE_URL}/api/twitch/token`);
    const { accessToken } = await tokenResponse.json();

    await manageTwitchSubscriptions(user.user_metadata.twitch_user_id, botEnabled, accessToken);
    
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error managing Twitch subscriptions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 