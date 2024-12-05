import { createClient } from '@/utils/supabase/client';
import { Transcript, TranscriptType } from '@/types/transcripts';

export const saveTranscript = async (
  text: string, 
  type: TranscriptType = TranscriptType.TRANSCRIPT
): Promise<{ error: any | null }> => {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('transcripts')
      .insert([{
        user_id: user.id,
        text,
        type,
        timestamp: new Date().toISOString()
      }]);

    if (error) throw error;
    
    return { error: null };
  } catch (err) {
    console.error('Error saving transcript:', err);
    return { error: err };
  }
};

export const getTranscripts = async (type?: TranscriptType) => {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');
    
    let query = supabase
      .from('transcripts')
      .select('*')
      .eq('user_id', user.id)  // Only get current user's transcripts
      .order('created_at', { ascending: false });
      
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data;
  } catch (err) {
    console.error('Error fetching transcripts:', err);
    return [];
  }
};

// Optional: Add a function to delete transcripts
export const deleteTranscript = async (transcriptId: string) => {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('transcripts')
      .delete()
      .eq('id', transcriptId)
      .eq('user_id', user.id); // Ensure users can only delete their own transcripts

    if (error) throw error;
    
    return { error: null };
  } catch (err) {
    console.error('Error deleting transcript:', err);
    return { error: err };
  }
}; 