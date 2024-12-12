'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function BotPromptForm({ botPrompt }: { botPrompt: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prompt, setPrompt] = useState(botPrompt);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');
      console.log(user);
      const { error } = await supabase
        .from('stream_settings')
        .update({ bot_prompt: prompt })
        .eq('user_id', user.id)
        .eq('platform', 'twitch');

      if (error) throw error;
      
      router.refresh();
    } catch (error) {
      console.error('Error updating bot prompt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      title="Bot Personality"
      description="Define how your bot should behave in chat"
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 sm:pb-0 text-sm text-zinc-400">
            💡 Be specific about tone, knowledge, and behavior
          </p>
          <Button
            variant="slim"
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            💾 Save Personality
          </Button>
        </div>
      }
    >
      <div className="mt-8 space-y-4">
        <textarea
          className="w-full h-48 p-4 text-black bg-white border rounded-md focus:ring-2 focus:ring-blue-500"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: Act as a friendly moderator who knows about gaming and streaming. Keep responses brief and engaging..."
        />
      </div>
    </Card>
  );
} 