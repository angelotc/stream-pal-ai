import { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

export const getUser = async (supabase: SupabaseClient) => {
  return unstable_cache(
    async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    ['user'],
    { revalidate: 60 }
  )();
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
    { revalidate: 60 }
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
    { revalidate: 3600 }
  )();
};

export const getUserDetails = async (supabase: SupabaseClient) => {
  return unstable_cache(
    async () => {
      const { data: userDetails } = await supabase
        .from('users')
        .select('*')
        .single();
      return userDetails;
    },
    ['user-details'],
    { revalidate: 60 }
  )();
};
