
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
      title="Response Rate"
      description="Set how often your bot can respond. Note: the lower the value, the more message credits you will use."
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 sm:pb-0 text-sm text-zinc-400">
            ⏱️ Current cooldown: {cooldown} seconds
          </p>
          <Button variant="slim" onClick={handleSubmit} loading={isSubmitting}>
            ⚡ Update Rate
          </Button>
        </div>
      }
    >
      <div className="mt-8 space-y-4">
        <input
          type="range"
          min="1"
          max="60"
          value={cooldown}
          onChange={(e) => setCooldown(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-zinc-400">
          <span>Faster (1s)</span>
          <span>Slower (60s)</span>
        </div>
      </div>
    </Card>
  );
}