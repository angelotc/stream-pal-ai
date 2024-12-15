import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { manageTwitchSubscriptions  } from '@/app/api/twitch/subscriptions/service';
import { getStreamerData, getToken } from '@/utils/twitch/auth';


export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { botEnabled } = await request.json();
    
    // Get fresh token
    const accessToken = await getToken({
        twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
        twitch_client: process.env.TWITCH_CLIENT_ID!
    });
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