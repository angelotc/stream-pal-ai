'use client';

import { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

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

      // Create WebSocket connection to our API route
      const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/deepgram`);
      
      socket.onopen = () => {
        console.log('WebSocket connection established');
        
        // Create MediaRecorder instance
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };

        mediaRecorder.start(250); // Collect 250ms of data at a time
      };

      socket.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);
          // Update to handle Deepgram's transcript format
          if (data.channel?.alternatives?.[0]?.transcript) {
            const transcript = data.channel.alternatives[0].transcript;
            console.log('Transcript:', transcript);
            setTranscribedText(prev => prev + ' ' + transcript);
          }
        } catch (error) {
          console.error('Error parsing transcript:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Error connecting to transcription service');
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed');
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
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