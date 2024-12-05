'use client';

import { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useDeepgram, LiveConnectionState, LiveTranscriptionEvents, LiveTranscriptionEvent } from '@/context/DeepgramContextProvider';
import { useMicrophone, MicrophoneEvents, MicrophoneState } from '@/context/MicrophoneContextProvider';

interface Transcript {
  text: string;
  timestamp: string;
}

export default function TranscriptionForm() {
  const [caption, setCaption] = useState<string | undefined>("Powered by Deepgram");
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone();
  const captionTimeout = useRef<NodeJS.Timeout>();
  const keepAliveInterval = useRef<NodeJS.Timeout>();

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

    const onTranscript = (data: LiveTranscriptionEvent) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      let thisCaption = data.channel.alternatives[0].transcript;

      if (thisCaption !== "") {
        setCaption(thisCaption);
      }

      if (isFinal && speechFinal && thisCaption.trim() !== "") {
        const now = new Date();
        const timestamp = now.toLocaleTimeString(); // e.g., "3:45:23 PM"
        
        setTranscripts(prev => [...prev, {
          text: thisCaption,
          timestamp
        }]);
        
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
        <div className="mt-8 mb-4 min-h-[100px] flex items-center justify-center">
          {caption && (
            <span className="bg-black/70 p-4 rounded-lg text-xl">
              {caption}
            </span>
          )}
        </div>
        
        {transcripts.length > 0 && (
          <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
            {transcripts.map((transcript, index) => (
              <div key={index} className="py-2 border-b last:border-0">
                <div className="text-sm text-gray-500 mb-1">
                  {transcript.timestamp}
                </div>
                <p>{transcript.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}