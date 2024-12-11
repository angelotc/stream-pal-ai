import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';
import { getStreamerData } from '@/utils/twitch/auth';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/signin`,
          error.name,
          "Sorry, we weren't able to log you in. Please try again."
        )
      );
    }

    if (data.user) {
      // Get Twitch username from user metadata
      const twitchUsername = data.user.user_metadata.full_name;
      
      // Get Twitch user data using our existing helper
      const accessToken = data.session?.provider_token;
      if (accessToken) {
        try {
          const twitchData = await getStreamerData({
            client_id: process.env.TWITCH_CLIENT_ID!,
            access_token: accessToken,
            twitch_username: twitchUsername
          });

          // Update user with Twitch user ID
          if (twitchData?.id) {
            await supabase.auth.updateUser({
              data: { 
                twitch_user_id: twitchData.id,
                twitch_user_name: twitchUsername
              }
            });
          }
        } catch (error) {
          console.error('Error fetching Twitch data:', error);
        }
      }
    }
  }

  return NextResponse.redirect(
    getStatusRedirect(
      `${requestUrl.origin}/account`,
      'Success!',
      'You are now signed in.'
    )
  );
}