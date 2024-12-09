'use client';

import { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useDeepgram, LiveConnectionState, LiveTranscriptionEvents, LiveTranscriptionEvent } from '@/context/DeepgramContextProvider';
import { useMicrophone, MicrophoneEvents, MicrophoneState } from '@/context/MicrophoneContextProvider';
import { saveMessage, getMessages } from '@/utils/messages';
import { Database } from '@/types_db';
import { createClient } from '@/utils/supabase/client';

type MessageRow = Database['public']['Tables']['messages']['Row'];

interface Transcript {
  text: string;
  timestamp: string;
}

const MessageTime = ({ timestamp }: { timestamp: string | null }) => (
  <span className="text-sm text-gray-500 min-w-[45px]">
    {timestamp ? new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) : ''}
  </span>
);

const MessageAuthor = ({ type, username }: { type: string, username: string | null }) => (
  <span className={`font-medium ${type === 'transcript' ? 'text-blue-500' : 'text-purple-500'}`}>
    {type === 'transcript' ? 'You 🎤 : ' : `${username} : `}
  </span>
);

const Message = ({ message }: { message: MessageRow }) => (
  <div className="py-2.5 border-b last:border-0 bg-white px-4 rounded-md mb-2 shadow-sm hover:bg-gray-50 transition-colors">
    <p className="text-black flex items-baseline gap-2">
      <MessageTime timestamp={message.created_at} />
      <MessageAuthor type={message.type} username={message.chatter_user_name} />
      <span className="flex-1">{message.text}</span>
    </p>
  </div>
);

export default function MessagesForm() {
  const [caption, setCaption] = useState<string | undefined>("Powered by Deepgram");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone();
  const captionTimeout = useRef<NodeJS.Timeout>();
  const keepAliveInterval = useRef<NodeJS.Timeout>();

  // Initialize Supabase client
  const supabase = createClient();

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const twitchUserId = user?.user_metadata?.provider_id;
      console.log('Loading messages for Twitch ID:', twitchUserId);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('broadcaster_twitch_id', twitchUserId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      console.log('Messages query result:', { data, error });
      
      if (error) {
        console.error('Error loading messages:', error);
        return;
      }
      
      if (data) {
        setMessages(data);
      }
    };

    loadMessages();
  }, [supabase]);

  // Subscribe to new messages
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const twitchUserId = user?.user_metadata?.provider_id;
      
      const channel = supabase
        .channel('messages')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `broadcaster_twitch_id=eq.${twitchUserId}` 
          }, 
          (payload) => {
            const newMessage = payload.new as MessageRow;
            setMessages(prev => [newMessage, ...prev]);
          }
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    };

    setupSubscription();
  }, [supabase]);

  useEffect(() => {
    setupMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready) {
      connectToDeepgram({
        model: "nova-2",
        interim_results: true,
        smart_format: true,
        filler_words: true,
        utterance_end_ms: 3000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState]);

  useEffect(() => {
    if (!microphone || !connection) return;

    const onData = (e: BlobEvent) => {
      if (e.data.size > 0 && connection.getReadyState() === 1) {
        connection?.send(e.data);
      }
    };

    const onTranscript = async (data: LiveTranscriptionEvent) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      let thisCaption = data.channel.alternatives[0].transcript;

      if (thisCaption !== "") {
        setCaption(thisCaption);
      }

      if (isFinal && speechFinal && thisCaption.trim() !== "") {
        const { error } = await saveMessage(thisCaption, 'transcript');
        if (error) {
          console.error('Failed to save transcript:', error);
        }
        
        clearTimeout(captionTimeout.current);
        captionTimeout.current = setTimeout(() => {
          setCaption(undefined);
          clearTimeout(captionTimeout.current);
        }, 3000);
      }
    };

    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
    }

    return () => {
      if (connection) {
        connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      }
      if (microphone) {
        microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      }
      clearTimeout(captionTimeout.current);
    };
  }, [connectionState, connection, microphone]);

  // Keep connection alive
  useEffect(() => {
    if (!connection) return;

    if (microphoneState !== MicrophoneState.Open && connectionState === LiveConnectionState.OPEN) {
      connection.keepAlive();
      keepAliveInterval.current = setInterval(() => {
        connection.keepAlive();
      }, 10000);
    } else {
      clearInterval(keepAliveInterval.current);
    }

    return () => {
      clearInterval(keepAliveInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState, connectionState]);

  const handleTranscription = async () => {
    // Check live status when they hit record
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('is_live')
      .eq('id', user.id)
      .single();
    
    if (error || !data?.is_live) {
      alert('You must be live to start recording');
      return;
    }

    if (microphoneState === MicrophoneState.Open) {
      stopMicrophone();
    } else if (microphoneState === MicrophoneState.Ready) {
      startMicrophone();
    }
  };

  return (
    <Card
      title="Voice Transcription"
      description="Record and transcribe your voice in real-time"
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 sm:pb-0">
            {microphoneState === MicrophoneState.Open ? (
              <span className="text-red-500">Recording...</span>
            ) : (
              'Click to start recording'
            )}
          </p>
          <Button
            variant="slim"
            onClick={handleTranscription}
            className={microphoneState === MicrophoneState.Open ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {microphoneState === MicrophoneState.Open ? 'Stop Recording' : 'Start Recording'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col space-y-4">
        <div className="mt-8 mb-4 min-h-[100px] flex items-center justify-center">
          {caption && (
            <span className="bg-black/70 p-4 rounded-lg text-xl">
              {caption}
            </span>
          )}
        </div>
        
        {(messages.length > 0) && (
          <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto bg-gray-50">
            {messages
              .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
              .map((item) => (
                <Message key={item.id} message={item} />
              ))}
          </div>
        )}
      </div>
    </Card>
  );
}