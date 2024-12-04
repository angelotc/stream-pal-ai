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
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startTranscription = () => {
    setError(null); // Reset error state
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser. Please try using Chrome or Edge.');
      return;
    }

    try {
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
        let errorMessage = 'An error occurred with speech recognition.';
        
        switch (event.error) {
          case 'network':
            errorMessage = 'Network error occurred. Please check your internet connection and try again.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access was denied. Please allow microphone access and try again.';
            break;
          case 'no-speech':
            errorMessage = 'No speech was detected. Please try again.';
            break;
        }
        
        setError(errorMessage);
        setIsTranscribing(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsTranscribing(true);
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setError('An error occurred while initializing speech recognition.');
    }
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