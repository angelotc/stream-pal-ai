import { MessageTimeProps, MessageAuthorProps, MessageProps } from '@/types/messages';

export const MessageTime = ({ timestamp }: MessageTimeProps) => (
  <span className="text-sm text-gray-500 min-w-[45px]">
    {timestamp ? new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) : ''}
  </span>
);

export const MessageAuthor = ({ type, username }: MessageAuthorProps) => (
  <span className={`font-medium ${type === 'transcript' ? 'text-blue-500' : 'text-purple-500'}`}>
    {type === 'transcript' ? 'You 🎤 : ' : `${username} : `}
  </span>
);

export const Message = ({ message }: MessageProps) => (
  <div className="py-2.5 border-b last:border-0 bg-white px-4 rounded-md mb-2 shadow-sm hover:bg-gray-50 transition-colors">
    <p className="text-black flex items-baseline gap-2">
      <MessageTime timestamp={message.created_at} />
      <MessageAuthor type={message.type} username={message.chatter_user_name} />
      <span className="flex-1">{message.text}</span>
    </p>
  </div>
);