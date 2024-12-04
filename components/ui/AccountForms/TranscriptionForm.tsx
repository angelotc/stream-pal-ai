'use client';

import { useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

// Add these type declarations
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
}

export default function TranscriptionForm() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startTranscription = () => {
    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(Object.keys(event.results))
        .map(key => event.results[Number(key)][0].transcript)
        .join('');
      setTranscribedText(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionError) => {
      console.error('Speech recognition error:', event.error);
      setIsTranscribing(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsTranscribing(true);
  };

  const stopTranscription = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
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
            {isTranscribing 
              ? 'Listening to your voice...' 
              : 'Click to start recording and transcribing'}
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