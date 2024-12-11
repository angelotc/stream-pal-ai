import { Message } from './MessageComponents';
import type { Database } from '@/types_db';

type MessageRow = Database['public']['Tables']['messages']['Row'];

export const MessageList = ({ messages }: { messages: MessageRow[] }) => {
  if (!messages.length) return null;
  
  return (
    <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto bg-gray-50">
      {messages
        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
        .map((item) => (
          <Message key={item.id} message={item} />
        ))}
    </div>
  );
}; 