'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function BotCooldownForm({ initialCooldown = 5 }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(initialCooldown);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');
      
      const { error } = await supabase
        .from('stream_settings')
        .update({ bot_cooldown_seconds: cooldown })
        .eq('user_id', user.id)
        .eq('platform', 'twitch');

      if (error) throw error;
      
      router.refresh();
    } catch (error) {
      console.error('Error updating bot cooldown:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      title="Bot Cooldown Settings"
      description="Control how frequently the bot responds"
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 sm:pb-0">
            Minimum seconds between bot responses
          </p>
          <Button
            variant="slim"
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            Save Cooldown
          </Button>
        </div>
      }
    >
      <div className="mt-8">
        <input
          type="number"
          min="1"
          max="300"
          value={cooldown}
          onChange={(e) => setCooldown(Number(e.target.value))}
          className="w-full p-4 text-black bg-white border rounded-md"
        />
      </div>
    </Card>
  );
}