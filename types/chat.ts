import { Database } from '@/types_db';

type MessageType = Database['public']['Tables']['messages']['Row']['type'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type ChatMessage = {
    text: MessageRow['text'];
    chatter_user_name: MessageRow['chatter_user_name'];
    twitch_user_id: UserRow['twitch_user_id'];
    created_at: MessageRow['created_at'];
};

export type {
    MessageType,
    MessageRow,
    UserRow,
    ChatMessage
}; 