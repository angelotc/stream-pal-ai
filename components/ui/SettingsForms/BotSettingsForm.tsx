'use client';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Database } from '@/types_db';

export default function BotSettingsForm({ botEnabled }: { botEnabled: boolean }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enabled, setEnabled] = useState(botEnabled);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');
      
      const { error } = await supabase
        .from('users')
        .update({ bot_enabled: !enabled })
        .eq('id', user.id);

      if (error) throw error;

      // Call our server endpoint instead of directly managing subscriptions
      const response = await fetch('/api/twitch/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ botEnabled: !enabled })
      });

      if (!response.ok) {
        throw new Error('Failed to manage Twitch subscriptions');
      }
      
      setEnabled(!enabled);
      router.refresh();
    } catch (error) {
      console.error('Error updating bot settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      title="Bot Settings"
      description="Enable or disable the bot assistant."
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 sm:pb-0">
            {enabled ? 'Bot is currently enabled' : 'Bot is currently disabled'}
          </p>
          <Button
            variant="slim"
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            {enabled ? 'Disable Bot' : 'Enable Bot'}
          </Button>
        </div>
      }
    >
      <div className="mt-8 mb-4 text-xl font-semibold">
        <p className="text-zinc-400">
          When enabled, the bot will join your stream and chat with viewers when you go live.
        </p>
      </div>
    </Card>
  );
}