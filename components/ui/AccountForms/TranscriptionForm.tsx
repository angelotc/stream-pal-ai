'use client';

import { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useDeepgram, LiveConnectionState,  LiveTranscriptionEvents, LiveTranscriptionEvent } from '@/context/DeepgramContextProvider';
import { useMicrophone, MicrophoneEvents, MicrophoneState } from '@/context/MicrophoneContextProvider';

export default function TranscriptionForm() {
  const [caption, setCaption] = useState<string | undefined>('Powered by Deepgram');
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone();
  
  const captionTimeout = useRef<NodeJS.Timeout>();
  const keepAliveInterval = useRef<NodeJS.Timeout>();

  // Initialize microphone on component mount
  useEffect(() => {
    setupMicrophone().catch((err) => {
      setError('Error accessing microphone. Please ensure microphone permissions are granted.');
      console.error(err);
    });
    
    return () => {
      clearTimeout(captionTimeout.current);
      clearInterval(keepAliveInterval.current);
    };
  }, [setupMicrophone]);

  // Connect to Deepgram when microphone is ready
  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready && isTranscribing) {
      connectToDeepgram({
        model: "nova-2",
        interim_results: true,
        smart_format: true,
        filler_words: true,
        utterance_end_ms: 3000,
      });
    }
  }, [microphoneState, connectToDeepgram, isTranscribing]);

  // Handle audio streaming and transcription
  useEffect(() => {
    if (!microphone || !connection) return;

    const onData = (e: BlobEvent) => {
      // iOS Safari fix: Prevent empty packets
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    const onTranscript = (data: LiveTranscriptionEvent) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      let thisCaption = data.channel.alternatives[0].transcript;

      if (thisCaption !== "") {
        setCaption(thisCaption);
      }

      if (isFinal && speechFinal) {
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
      startMicrophone();
    }

    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      clearTimeout(captionTimeout.current);
    };
  }, [connectionState, connection, microphone, startMicrophone]);

  // Keep connection alive
  useEffect(() => {
    if (!connection) return;

    if (microphoneState !== MicrophoneState.Open && 
        connectionState === LiveConnectionState.OPEN) {
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
  }, [microphoneState, connectionState, connection]);

  const handleTranscription = async () => {
    setError(null);
    if (isTranscribing) {
      stopMicrophone();
      setIsTranscribing(false);
      setCaption(undefined);
    } else {
      setIsTranscribing(true);
    }
  };

  return (
    <Card
      title="Voice Transcription"
      description="Record and transcribe your voice in real-time"
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 sm:pb-0">
            {error ? (
              <span className="text-red-500">{error}</span>
            ) : (
              isTranscribing 
                ? 'Listening to your voice...' 
                : 'Click to start recording and transcribing'
            )}
          </p>
          <Button
            variant="slim"
            onClick={handleTranscription}
            className={isTranscribing ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isTranscribing ? 'Stop Recording' : 'Start Recording'}
          </Button>
        </div>
      }
    >
      <div className="mt-8 mb-4 min-h-[100px] flex items-center justify-center">
        {caption && (
          <span className="bg-black/70 p-4 rounded-lg text-xl">
            {caption}
          </span>
        )}
      </div>
    </Card>
  );
}