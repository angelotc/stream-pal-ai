import { Database } from '@/types_db';

type MessageType = Database['public']['Tables']['messages']['Row']['type'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type ChatMessage = Pick<MessageRow, 'text' | 'chatter_user_name'> & {
    twitch_user_id: UserRow['twitch_user_id'];
};

export type {
    MessageType,
    MessageRow,
    UserRow,
    ChatMessage
}; 