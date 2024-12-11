import { Database } from '@/types_db';

export type MessageRow = Database['public']['Tables']['messages']['Row'];

export interface MessageTimeProps {
  timestamp: string | null;
}

export interface MessageAuthorProps {
  type: string;
  username: string | null;
}

export interface MessageProps {
  message: MessageRow;
}
