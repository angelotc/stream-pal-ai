'use client';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
      title="Bot Status"
      description="Control when your bot is active"
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 sm:pb-0 text-sm text-zinc-400">
            {enabled ? '✅ Bot is active and will respond to chat' : '⏸️ Bot is paused'}
          </p>
          <Button variant="slim" onClick={handleSubmit} loading={isSubmitting}>
            {enabled ? '🛑 Pause Bot' : '▶️ Activate Bot'}
          </Button>
        </div>
      }
    >
      <div className="mt-8 space-y-4 text-zinc-400">
        <p>When active, the bot will:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Join your stream when you go live</li>
          <li>Respond to chat messages based on your settings</li>
          <li>Follow your custom prompt and cooldown rules</li>
        </ul>
      </div>
    </Card>
  );
}