
import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { STREAM_SETTINGS } from '@/config/constants';

export default function BotPromptForm({ botPrompt }: { botPrompt: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prompt, setPrompt] = useState(botPrompt);
  const [error, setError] = useState<string | null>(null);

  const remainingChars = STREAM_SETTINGS.MAX_PERSONALITY_LENGTH - prompt.length;
  const isOverLimit = remainingChars < 0;

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setPrompt(newValue);
    setError(null);
    
    if (newValue.length > STREAM_SETTINGS.MAX_PERSONALITY_LENGTH) {
      setError(`Personality prompt must be ${STREAM_SETTINGS.MAX_PERSONALITY_LENGTH} characters or less`);
    }
  };

  const handleSubmit = async () => {
    if (isOverLimit) {
      setError(`Personality prompt must be ${STREAM_SETTINGS.MAX_PERSONALITY_LENGTH} characters or less`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { error: supabaseError } = await supabase
        .from('stream_settings')
        .update({ bot_prompt: prompt })
        .eq('user_id', user.id)
        .eq('platform', 'twitch');

      if (supabaseError) throw supabaseError;
      
      router.refresh();
    } catch (error) {
      console.error('Error updating bot prompt:', error);
      setError('Failed to update bot personality');
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
          <div className="flex flex-col gap-2">
            <p className="pb-4 sm:pb-0 text-sm text-zinc-400">
              💡 Be specific about tone, knowledge, and behavior
            </p>
            <p className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-zinc-400'}`}>
              {remainingChars} characters remaining
            </p>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          <Button
            variant="slim"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isOverLimit || isSubmitting}
          >
            💾 Save Personality
          </Button>
        </div>
      }
    >
      <div className="mt-8 space-y-4">
        <textarea
          className={`w-full h-48 p-4 text-black bg-white border rounded-md focus:ring-2 focus:ring-blue-500 
            ${isOverLimit ? 'border-red-500' : 'border-gray-300'}`}
          value={prompt}
          onChange={handlePromptChange}
          placeholder="Example: Act as a friendly moderator who knows about gaming and streaming. Keep responses brief and engaging..."
          maxLength={STREAM_SETTINGS.MAX_PERSONALITY_LENGTH}
        />
      </div>
    </Card>
  );
} 