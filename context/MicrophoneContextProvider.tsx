"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";

interface MicrophoneContextType {
  microphone: MediaRecorder | null;
  startMicrophone: () => void;
  stopMicrophone: () => void;
  setupMicrophone: () => void;
  microphoneState: MicrophoneState | null;
}

export enum MicrophoneEvents {
  DataAvailable = "dataavailable",
  Error = "error",
  Pause = "pause",
  Resume = "resume",
  Start = "start",
  Stop = "stop",
}

export enum MicrophoneState {
  NotSetup = -1,
  SettingUp = 0,
  Ready = 1,
  Opening = 2,
  Open = 3,
  Error = 4,
  Pausing = 5,
  Paused = 6,
}

const MicrophoneContext = createContext<MicrophoneContextType | undefined>(
  undefined
);

interface MicrophoneContextProviderProps {
  children: ReactNode;
}

const MicrophoneContextProvider: React.FC<MicrophoneContextProviderProps> = ({
  children,
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

      const microphone = new MediaRecorder(userMedia);

      setMicrophoneState(MicrophoneState.Ready);
      setMicrophone(microphone);
    } catch (err: any) {
      console.error(err);

      throw err;
    }
  };

  const stopMicrophone = useCallback(() => {
    if (!microphone || microphone.state === "inactive") {
      return; // Not recording, do nothing
    }

    setMicrophoneState(MicrophoneState.Pausing);
    try {
      microphone.stop();
      setMicrophoneState(MicrophoneState.Ready);
    } catch (err) {
      console.error('Error stopping microphone:', err);
      setMicrophoneState(MicrophoneState.Error);
    }
  }, [microphone]);

  const startMicrophone = useCallback(() => {
    if (microphone?.state === "recording") {
      return; // Already recording, do nothing
    }

    setMicrophoneState(MicrophoneState.Opening);

    try {
      if (microphone?.state === "paused") {
        microphone.resume();
      } else if (microphone?.state === "inactive") {
        microphone?.start(250);
      }
      setMicrophoneState(MicrophoneState.Open);
    } catch (err) {
      console.error('Error starting microphone:', err);
      setMicrophoneState(MicrophoneState.Error);
    }
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

function useMicrophone(): MicrophoneContextType {
  const context = useContext(MicrophoneContext);

  if (context === undefined) {
    throw new Error(
      "useMicrophone must be used within a MicrophoneContextProvider"
    );
  }

  return context;
}

export { MicrophoneContextProvider, useMicrophone };
