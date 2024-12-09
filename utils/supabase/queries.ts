import { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

export const getUser = async (supabase: SupabaseClient) => {
  // Don't cache user state to ensure we always have fresh auth data
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getSubscription = async (supabase: SupabaseClient) => {
  return unstable_cache(
    async () => {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*, prices(*, products(*))')
        .in('status', ['trialing', 'active'])
        .maybeSingle();
      return subscription;
    },
    ['subscription'],
    { revalidate: 60, tags: ['subscription'] }
  )();
};

export const getProducts = async (supabase: SupabaseClient) => {
  return unstable_cache(
    async () => {
      const { data: products } = await supabase
        .from('products')
        .select('*, prices(*)')
        .eq('active', true)
        .eq('prices.active', true)
        .order('metadata->index')
        .order('unit_amount', { referencedTable: 'prices' });
      return products;
    },
    ['products'],
    { revalidate: 3600, tags: ['products'] }
  )();
};

export const getUserDetails = async (supabase: SupabaseClient) => {
  // Reduced cache time and added user-specific key
  return unstable_cache(
    async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: userDetails } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      return userDetails;
    },
    ['user-details'],
    { revalidate: 10, tags: ['user-details'] } // Reduced to 10 seconds
  )();
};

export const getBotPrompt = async (supabase: SupabaseClient) => {
  return unstable_cache(
    async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: streamSettings } = await supabase
        .from('stream_settings')
        .select('bot_prompt')
        .eq('user_id', user.id)
        .eq('platform', 'twitch')
        .single();
      return streamSettings;
    },
    ['bot-prompt'],
    { revalidate: 1, tags: ['bot-prompt'] }
  )();
};
