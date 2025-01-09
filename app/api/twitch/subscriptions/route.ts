import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { manageTwitchSubscriptions  } from '@/app/api/twitch/subscriptions/service';
import { getStreamerData } from '@/app/api/twitch/subscriptions/service';


export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    console.log("user", user);
    console.log("request", request);
    console.log('process.env.SITE_URL', process.env.SITE_URL);
    const { botEnabled } = await request.json();
    console.log("botEnabled", botEnabled);
    const tokenResponse = await fetch(`/api/twitch/token`);
    const { accessToken } = await tokenResponse.json();

    console.log("accessToken", accessToken);
    console.log("user.user_metadata.full_name", user.user_metadata.full_name);
    console.log("process.env.TWITCH_CLIENT_ID!", process.env.TWITCH_CLIENT_ID!);
    const streamerData = await getStreamerData({ 
        client_id: process.env.TWITCH_CLIENT_ID!,
        access_token: accessToken,
        twitch_username: user.user_metadata.full_name 
    });
    console.log("streamerData", streamerData);
         
    await manageTwitchSubscriptions(streamerData.id, botEnabled, accessToken);
    
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error managing Twitch subscriptions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 