'use client';

import { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useDeepgram, LiveConnectionState, LiveTranscriptionEvents, LiveTranscriptionEvent } from '@/context/DeepgramContextProvider';
import { useMicrophone, MicrophoneEvents, MicrophoneState } from '@/context/MicrophoneContextProvider';
import { processMessage } from '@/utils/messages/service';
import { DEEPGRAM, TRANSCRIPTION } from '@/config/constants';
import { Message } from '@/components/ui/Messages/MessageComponents';
import { useMessageLoader } from '@/hooks/useMessageLoader';

export default function MessagesForm() {
  const [caption, setCaption] = useState<string | undefined>("Powered by Deepgram");
  const { messages, isLoading, user } = useMessageLoader();
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone(); 1
  const captionTimeout = useRef<NodeJS.Timeout>();
  const keepAliveInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setupMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready) {
      connectToDeepgram({
        model: DEEPGRAM.OPTIONS.MODEL,
        interim_results: DEEPGRAM.OPTIONS.interim_results,
        smart_format: DEEPGRAM.OPTIONS.smart_format,
        filler_words: DEEPGRAM.OPTIONS.filler_words,
        utterance_end_ms: DEEPGRAM.OPTIONS.UTTERANCE_END_MS,
        vad_events: DEEPGRAM.OPTIONS.vad_events
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

    const SAVE_DELAY = 2000; // 2 second delay before saving
    let transcriptBuffer = '';
    let saveTimeout: NodeJS.Timeout | null = null;

    const onTranscript = async (data: LiveTranscriptionEvent) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      let thisCaption = data.channel.alternatives[0].transcript.trim();

      if (!thisCaption) return;

      if (!isFinal) {
        setCaption(thisCaption);
        return;
      }

      if (isFinal) {
        const now = Date.now();

        // Clear any existing save timeout
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }

        // Always append to buffer
        transcriptBuffer += (transcriptBuffer ? ' ' : '') + thisCaption;
        // Set a new timeout to save the buffer
        saveTimeout = setTimeout(async () => {
          if (transcriptBuffer) {
            await processMessage({
              text: transcriptBuffer,
              type: 'transcript',
              userId: user.id,  // You'll need to get the user from Supabase auth
              broadcasterId: user.user_metadata.provider_id,
              chatterName: user.user_metadata.name,
              chatterId: user.user_metadata.provider_id,
              isWebhook: false
            });
            transcriptBuffer = '';
          }
        }, SAVE_DELAY);

        // Update UI
        setCaption(transcriptBuffer);

        // Clear caption after delay
        clearTimeout(captionTimeout.current);
        captionTimeout.current = setTimeout(() => {
          setCaption(undefined);
        }, DEEPGRAM.OPTIONS.CAPTION_TIMEOUT);
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



  const handleTranscription = () => {
    if (microphoneState === MicrophoneState.Open || microphoneState === MicrophoneState.Opening) {
      stopMicrophone();
    } else if (microphoneState === MicrophoneState.Ready || microphoneState === MicrophoneState.Paused) {
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
        {isLoading ? (
          <div className="flex justify-center p-4">
            <span>Loading messages...</span>
          </div>
        ) : (
          <>
            <div className="mt-8 mb-4 min-h-[100px] flex items-center justify-center">
              {caption && (
                <span className="bg-black/70 p-4 rounded-lg text-xl">
                  {caption}
                </span>
              )}
            </div>

            {(messages.length > 0) && (
              <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto bg-gray-50">
                {messages.map((item) => (
                  <Message key={item.id} message={item} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}