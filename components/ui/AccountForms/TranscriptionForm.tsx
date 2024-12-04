'use client';

import { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { createClient } from '@deepgram/sdk';

interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionError {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionError) => void;
  onend: () => void;
}

export default function TranscriptionForm() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on component unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const startTranscription = async () => {
    try {
      setError(null);
      
      // Get microphone permission and stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Fetch Deepgram API key
      const response = await fetch('/api/deepgram');
      const data = await response.json();
      
      if (!data.key) {
        throw new Error('Failed to get Deepgram API key');
      }

      // Create WebSocket connection to Deepgram
      const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?token=${data.key}`);

      socket.onopen = () => {
        console.log('WebSocket connection established');
        
        // Create MediaRecorder instance
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };

        mediaRecorder.start(250); // Collect data every 250ms
      };

      socket.onmessage = (message) => {
        const received = JSON.parse(message.data);
        const transcript = received.channel?.alternatives[0]?.transcript;
        
        if (transcript) {
          setTranscribedText(prev => prev + ' ' + transcript);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('An error occurred with the transcription service');
        stopTranscription();
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed');
      };

      socketRef.current = socket;
      setIsTranscribing(true);

    } catch (error) {
      console.error('Error starting transcription:', error);
      setError('Error accessing microphone. Please ensure microphone permissions are granted.');
      stopTranscription();
    }
  };

  const stopTranscription = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setIsTranscribing(false);
  };

  const handleTranscription = async () => {
    if (isTranscribing) {
      stopTranscription();
    } else {
      startTranscription();
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
      <div className="mt-8 mb-4 text-xl">
        {transcribedText || 'Your transcription will appear here...'}
      </div>
    </Card>
  );
}