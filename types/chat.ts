import { Database } from '@/types_db';

type MessageType = Database['public']['Tables']['messages']['Row']['type'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type ChatMessage = {
    text: MessageRow['text'];
    type: MessageType;
    chatter_user_name: MessageRow['chatter_user_name'];
    twitch_user_id: UserRow['twitch_user_id'];
    created_at: MessageRow['created_at'];
    broadcaster_twitch_id: UserRow['twitch_user_id'];
    responded_to?: MessageRow['responded_to'];
    id?: MessageRow['id'];
};

export type {
    MessageType,
    MessageRow,
    UserRow,
    ChatMessage
}; 