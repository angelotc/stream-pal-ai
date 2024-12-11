import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MessageRow } from '@/types/messages';

interface UseMessageLoaderOptions {
  limit?: number;
  autoSubscribe?: boolean;
}

export function useMessageLoader({ limit = 50, autoSubscribe = true }: UseMessageLoaderOptions = {}) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const twitchUserId = user?.user_metadata?.provider_id;

        if (!twitchUserId) {
          throw new Error('No Twitch user ID found');
        }

        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('broadcaster_twitch_id', twitchUserId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fetchError) throw fetchError;
        if (data) setMessages(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load messages'));
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [supabase, limit]);

  // Subscribe to new messages
  useEffect(() => {
    if (!autoSubscribe) return;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const twitchUserId = user?.user_metadata?.provider_id;

      if (!twitchUserId) return;

      const channel = supabase
        .channel('messages')
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `broadcaster_twitch_id=eq.${twitchUserId}`
          },
          (payload) => {
            const newMessage = payload.new as MessageRow;
            setMessages(prev => [newMessage, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [supabase, autoSubscribe]);

  return {
    messages,
    setMessages,
    isLoading,
    error,
    user
  };
} 