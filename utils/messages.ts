import { createClient } from '@/utils/supabase/client';
import { Database } from '@/types_db';
import { sendTwitchMessage } from './twitch/chat';
import OpenAI from 'openai';

type MessageType = Database['public']['Tables']['messages']['Row']['type'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type ChatMessage = {
    text: string;
    chatter_user_name: string;
};

const INTERACTION_COOLDOWN = 10 * 1000; // 10 seconds
const MESSAGE_CONTEXT_SIZE = 10;
const RESPONSE_DELAY = 2000; // 2 seconds delay before responding

function shouldInteract(lastInteractionTime: string | null): boolean {
    if (!lastInteractionTime) return true;
    const now = Date.now();
    const lastInteraction = new Date(lastInteractionTime).getTime();
    return (now - lastInteraction) >= INTERACTION_COOLDOWN;
}

async function generateAIResponse(messages: ChatMessage[]) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `You are a friendly chat bot engaging with Twitch chat. 
        Based on the recent messages, generate a natural, engaging response.
        Recent context: ${messages.map(m => `${m.chatter_user_name}: ${m.text}`).join('\n')}`;

    const completion = await openai.chat.completions.create({
        messages: [{ role: 'system', content: prompt }],
        model: "gpt-3.5-turbo",
        max_tokens: 100,
        temperature: 0.7
    });

    return completion.choices[0].message.content;
}
export const saveMessage = async (
  text: string, 
  type: MessageType
): Promise<{ error: any | null }> => {
  try {
    console.log('Starting saveMessage process...');
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const timestamp = new Date().toISOString();
    console.log('Saving message for user:', user.user_metadata?.provider_id);

    // Save the message
    const { error } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        text,
        type,
        timestamp,
        created_at: timestamp,
        broadcaster_twitch_id: user.user_metadata?.provider_id
      });

    if (error) throw error;
    console.log('Message saved successfully');

    // Add delay before processing AI response
    console.log(`Waiting ${RESPONSE_DELAY}ms before processing AI response...`);
    await new Promise(resolve => setTimeout(resolve, RESPONSE_DELAY));

    // Get stream settings
    console.log('Checking stream settings...');
    const { data: streamSettings } = await supabase
      .from('stream_settings')
      .select('*')
      .eq('platform_user_id', user.user_metadata?.provider_id)
      .single();

    if (streamSettings && shouldInteract(streamSettings.last_interaction)) {
      console.log('Cooldown passed, fetching recent messages...');
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('broadcaster_twitch_id', user.user_metadata?.provider_id)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_CONTEXT_SIZE);

      if (recentMessages) {
        console.log(`Processing ${recentMessages.length} recent messages`);
        const formattedMessages: ChatMessage[] = recentMessages
          .filter((m): m is MessageRow & { chatter_user_name: string; text: string } => 
            m.chatter_user_name !== null && 
            m.text !== null && 
            typeof m.text === 'string' && 
            typeof m.chatter_user_name === 'string'
          )
          .map(m => ({
            text: m.text,
            chatter_user_name: m.chatter_user_name
          }));

        // Generate and send AI response
        console.log('Generating AI response...');
        const response = await generateAIResponse(formattedMessages);
        if (response && user.user_metadata?.provider_id) {
          console.log('Sending Twitch message:', response);
          await sendTwitchMessage(
            user.user_metadata.provider_id,
            response
          );

          // Update last interaction time
          console.log('Updating last interaction time...');
          await supabase
            .from('stream_settings')
            .update({ last_interaction: timestamp })
            .eq('platform_user_id', user.user_metadata.provider_id);
        }
      }
    } else {
      console.log('Skipping AI response due to cooldown');
    }
    
    return { error: null };
  } catch (err) {
    console.error('Error in saveMessage:', err);
    return { error: err };
  }
};

export const getMessages = async (type?: MessageType) => {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');
    
    let query = supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)  // Only get current user's messages
      .order('timestamp', { ascending: false });
      
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data;
  } catch (err) {
    console.error('Error fetching messages:', err);
    return [];
  }
};

export const deleteMessage = async (messageId: string) => {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', user.id); // Ensure users can only delete their own messages

    if (error) throw error;
    
    return { error: null };
  } catch (err) {
    console.error('Error deleting message:', err);
    return { error: err };
  }
}; 