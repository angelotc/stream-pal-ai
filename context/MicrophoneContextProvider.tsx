"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode
} from "react";

export enum MicrophoneState {
  NotSetup = 0,
  Ready = 1,
  Opening = 2,
  Open = 3,
  Error = 4,
  Pausing = 5,
  Paused = 6,
  SettingUp = 7
}

interface MicrophoneContextType {
  setupMicrophone: () => Promise<void>;
  microphone: MediaRecorder | null;
  startMicrophone: () => void;
  stopMicrophone: () => void;
  microphoneState: MicrophoneState | null;
}

const MicrophoneContext = createContext<MicrophoneContextType | undefined>(
  undefined
);

interface MicrophoneContextProviderProps {
  children: ReactNode;
}

export const MicrophoneContextProvider: React.FC<MicrophoneContextProviderProps> = ({
  children
}) => {
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>(
    MicrophoneState.NotSetup
  );
  const [microphone, setMicrophone] = useState<MediaRecorder | null>(null);

  const setupMicrophone = async () => {
    setMicrophoneState(MicrophoneState.SettingUp);

    try {
      const userMedia = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
        },
      });

      const recorder = new MediaRecorder(userMedia);
      setMicrophone(recorder);
      setMicrophoneState(MicrophoneState.Ready);
    } catch (error) {
      console.error('Error setting up microphone:', error);
      setMicrophoneState(MicrophoneState.Error);
      throw error;
    }
  };

  const stopMicrophone = useCallback(() => {
    if (!microphone) return;

    try {
      microphone.stop();
      microphone.stream.getTracks().forEach((track) => track.stop());
      setMicrophoneState(MicrophoneState.Ready);
    } catch (error) {
      console.error('Error stopping microphone:', error);
      setMicrophoneState(MicrophoneState.Error);
    }
  }, [microphone]);

  const startMicrophone = useCallback(() => {
    if (!microphone) return;
    
    microphone.start();
    setMicrophoneState(MicrophoneState.Open);
  }, [microphone]);

  return (
    <MicrophoneContext.Provider
      value={{
        microphone,
        startMicrophone,
        stopMicrophone,
        setupMicrophone,
        microphoneState,
      }}
    >
      {children}
    </MicrophoneContext.Provider>
  );
};

export function useMicrophone(): MicrophoneContextType {
  const context = useContext(MicrophoneContext);

  if (context === undefined) {
    throw new Error(
      "useMicrophone must be used within a MicrophoneContextProvider"
    );
  }

  return context;
}
