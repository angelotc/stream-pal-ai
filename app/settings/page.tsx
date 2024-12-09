import BotSettingsForm from '@/components/ui/SettingsForms/BotSettingsForm';
import BotPromptForm from '@/components/ui/SettingsForms/BotPromptForm';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  getUserDetails,
  getUser,
  getBotPrompt
} from '@/utils/supabase/queries';

export default async function Settings() {
  const supabase = createClient();
  const [user, userDetails, botPrompt] = await Promise.all([
    getUser(supabase),
    getUserDetails(supabase),
    getBotPrompt(supabase)
  ]);

  if (!user) {
    return redirect('/signin');
  }

  return (
    <section className="mb-32 bg-black">
      <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
        <div className="sm:align-center sm:flex sm:flex-col">
          <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
            Bot Settings
          </h1>
          <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-2xl">
            Configure your chat bot's behavior and responses.
          </p>
        </div>
      </div>
      <div className="p-4">
        <BotSettingsForm botEnabled={userDetails?.bot_enabled ?? false} />
        <BotPromptForm botPrompt={botPrompt?.bot_prompt ?? ''} />
      </div>
    </section>
  );
}