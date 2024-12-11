import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';
import { getStreamerData } from '@/utils/twitch/auth';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  console.log('OAuth callback received with code:', code ? 'present' : 'missing');

  if (code) {
    const supabase = createClient();
    console.log('Exchanging code for session...');
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Session exchange error:', error);
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/signin`,
          error.name,
          "Sorry, we weren't able to log you in. Please try again."
        )
      );
    }

    console.log('Session exchange successful, user data:', {
      id: data.user?.id,
      email: data.user?.email,
      metadata: data.user?.user_metadata
    });

    if (data.user) {
      // Get Twitch username from user metadata
      const twitchUsername = data.user.user_metadata.full_name;
      console.log('Twitch username from metadata:', twitchUsername);
      
      // Get Twitch user data using our existing helper
      const accessToken = data.session?.provider_token;
      console.log('Provider token present:', !!accessToken);

      if (accessToken) {
        try {
          console.log('Fetching Twitch user data...');
          const twitchData = await getStreamerData({
            client_id: process.env.TWITCH_CLIENT_ID!,
            access_token: accessToken,
            twitch_username: twitchUsername
          });
          console.log('Twitch user data:', twitchData);
          // Update user with Twitch user ID
          if (twitchData?.id) {
            try {
              // Update auth.users metadata
              const { data: updateData, error: updateError } = await supabase.auth.updateUser({
                data: { 
                  twitch_user_id: twitchData.id,
                  twitch_user_name: twitchUsername
                }
              });

              if (updateError) {
                console.error('Error updating user metadata:', updateError);
              } else {
                console.log('Successfully updated user metadata:', updateData.user.user_metadata);
                
                // Update the custom columns in the users table
                const { error: dbError } = await supabase
                  .from('users')
                  .update({
                    twitch_user_id: twitchData.id,
                    twitch_user_name: twitchUsername
                  })
                  .eq('id', data.user.id);

                if (dbError) {
                  console.error('Error updating users table:', dbError);
                } else {
                  console.log('Successfully updated users table');
                }
              }
            } catch (error) {
              console.error('Error in update operations:', error);
            }
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