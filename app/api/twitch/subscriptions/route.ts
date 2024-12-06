import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { manageTwitchSubscriptions  } from '@/utils/twitch/server';
import { getStreamerData, getToken, validateToken } from '@/utils/twitch/auth';


export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { botEnabled } = await request.json();
    const accessToken = await getToken({
        twitch_secret: process.env.TWITCH_CLIENT_SECRET!,
        twitch_client: process.env.TWITCH_CLIENT_ID!
    });
    // get Twitch user id from twitch username
    console.log ("accessToken", accessToken);
    console.log ("user", user);
    console.log ("botEnabled", botEnabled);
    console.log ("user.user_metadata.full_name: ", user.user_metadata.full_name);
    const twitchUserId = await getStreamerData({ 
        client_id: process.env.TWITCH_CLIENT_ID!,
        access_token: process.env.TWITCH_ACCESS_TOKEN!,
        twitch_username: user.user_metadata.full_name });
         
    await manageTwitchSubscriptions(twitchUserId, botEnabled, accessToken);
    
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error managing Twitch subscriptions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 