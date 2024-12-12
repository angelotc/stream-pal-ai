import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';
import { getStreamerData } from '@/utils/twitch/auth';
import { STREAM_SETTINGS } from '@/config/constants';

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
                  
                  // Before upserting, check if stream settings already exist
                  const { data: existingSettings, error: settingsCheckError } = await supabase
                    .from('stream_settings')
                    .select('*')
                    .eq('user_id', data.user.id)
                    .eq('platform', 'twitch')
                    .single();

                  if (settingsCheckError && settingsCheckError.code === 'PGRST116') {
                    console.log('No existing Twitch stream settings found for user. Creating defaults...');
                    
                    const { error: settingsError } = await supabase
                      .from('stream_settings')
                      .insert({
                        user_id: data.user.id,
                        platform: 'twitch',
                        platform_user_id: twitchData.id,
                        bot_cooldown_seconds: STREAM_SETTINGS.DEFAULT_COOLDOWN,
                        bot_prompt: STREAM_SETTINGS.DEFAULT_PROMPT.replace('{STREAMER_NAME}', twitchUsername),
                        is_live: STREAM_SETTINGS.DEFAULT_IS_LIVE,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      });

                    if (settingsError) {
                      console.error(settingsError);
                    }
                  } else if (!existingSettings) {
                    console.error(settingsCheckError);
                  }
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