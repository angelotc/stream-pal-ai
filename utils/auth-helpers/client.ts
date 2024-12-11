'use client';

import { createClient } from '@/utils/supabase/client';
import { type Provider } from '@supabase/supabase-js';
import { getURL } from '@/utils/helpers';
import { redirectToPath } from './server';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export async function handleRequest(
  e: React.FormEvent<HTMLFormElement>,
  requestFunc: (formData: FormData) => Promise<string>,
  router: AppRouterInstance | null = null
): Promise<boolean | void> {
  // Prevent default form submission refresh
  e.preventDefault();

  const formData = new FormData(e.currentTarget);
  const redirectUrl: string = await requestFunc(formData);

  if (router) {
    // If client-side router is provided, use it to redirect
    return router.push(redirectUrl);
  } else {
    // Otherwise, redirect server-side
    return await redirectToPath(redirectUrl);
  }
}

export async function signInWithOAuth(e: React.FormEvent<HTMLFormElement>) {
  // Prevent default form submission refresh
  e.preventDefault();
  console.log('Starting OAuth sign-in process...');

  const formData = new FormData(e.currentTarget);
  const provider = String(formData.get('provider')).trim() as Provider;
  console.log('Provider:', provider);

  // Create client-side supabase client and call signInWithOAuth
  const supabase = createClient();
  const redirectURL = getURL('/auth/callback');
  console.log('Redirect URL:', redirectURL);

  try {
    console.log('Initiating Supabase OAuth...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        scopes: 'channel:read:subscriptions channel:manage:broadcast chat:read chat:edit user:read:email',
        redirectTo: redirectURL,
        queryParams: {
          // Request additional Twitch user data
          claims: JSON.stringify({
            userinfo: {
              preferred_username: true,
              picture: true,
              email: true,
              sub: true  // This is the Twitch user ID
            }
          })
        }
      }
    });

    if (error) {
      console.error('OAuth error:', error);
    } else {
      console.log('OAuth initiated successfully:', data);
    }
  } catch (error) {
    console.error('Unexpected error during OAuth:', error);
  }
}
