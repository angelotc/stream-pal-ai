import { createClient } from '@/utils/supabase/client';
import { MessageType, ChatMessage } from '@/types/chat';
import { sendTwitchMessage } from './twitch/chat';
import { CHAT } from '@/config/constants';

function shouldInteract(lastInteractionTime: string | null): boolean {
    if (!lastInteractionTime) return true;
    const now = Date.now();
    const lastInteraction = new Date(lastInteractionTime).getTime();
    return (now - lastInteraction) >= CHAT.INTERACTION_COOLDOWN;
}

async function generateAIResponse(messages: ChatMessage[]) {
    // Find messages that haven't been responded to yet
    const unansweredMessages = messages.filter(m => 
        !m.responded_to && 
        m.type === 'transcript' && 
        m.text.trim().length > 0
    );

    // If we have unanswered messages, prioritize the most recent one
    const messageToRespond = unansweredMessages[0];
    
    if (!messageToRespond) {
      // Use the most recent message instead
      return generateAIResponse([messages[0]]);
    }
    console.log("messageToRespond", messageToRespond);
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            messages,
            priorityMessage: messageToRespond 
        })
    });
    
    if (!response.ok) throw new Error('Failed to generate AI response');
    const data = await response.json();

    // Mark the message as responded to
    await updateMessageResponseStatus(messageToRespond.id!);
    
    return data.content;
}

// Add function to update message status
async function updateMessageResponseStatus(messageId: string) {
    const supabase = createClient();
    await supabase
        .from('messages')
        .update({ responded_to: true })
        .eq('id', messageId);
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
    console.log('Saving message for user:', user);

    // Save the message with responded_to flag
    const { error } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        chatter_user_id: user.user_metadata?.name,
        text,
        type,
        timestamp,
        created_at: timestamp,
        broadcaster_twitch_id: user.user_metadata?.provider_id,
        responded_to: false  // Add this field
      });

    if (error) throw error;
    console.log('Message saved successfully');

    // Add delay before processing AI response
    console.log(`Waiting ${CHAT.RESPONSE_DELAY}ms before processing AI response...`);
    await new Promise(resolve => setTimeout(resolve, CHAT.RESPONSE_DELAY));

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
        .select(`
          *,
          users!inner (
            twitch_user_id
          )
        `)
        .eq('broadcaster_twitch_id', user.user_metadata?.provider_id)
        .order('created_at', { ascending: false })
        .limit(CHAT.MESSAGE_CONTEXT_SIZE);

      if (recentMessages) {
        console.log(`Processing ${recentMessages.length} recent messages`);
        const formattedMessages: ChatMessage[] = recentMessages.map(m => ({
          text: m.text ?? '',
          type: m.type,
          chatter_user_name: m.chatter_user_name ?? 'anonymous',
          twitch_user_id: m.users.twitch_user_id ?? 'unknown',
          created_at: m.created_at,
          broadcaster_twitch_id: m.broadcaster_twitch_id
        }));
        console.log('Formatted messages:', formattedMessages);
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