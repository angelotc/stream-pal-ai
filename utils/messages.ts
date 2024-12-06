import { createClient } from '@/utils/supabase/client';
import { Database } from '@/types_db';

// Define MessageType using the database schema
type MessageType = Database['public']['Tables']['messages']['Row']['type'];

export const saveMessage = async (
  text: string, 
  type: MessageType
): Promise<{ error: any | null }> => {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        text,
        type,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;
    
    return { error: null };
  } catch (err) {
    console.error('Error saving message:', err);
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