"use client";

import {
  createClient,
  LiveClient,
  LiveConnectionState,
  LiveTranscriptionEvents,
  type LiveSchema,
  type LiveTranscriptionEvent,
} from "@deepgram/sdk";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  FunctionComponent,
} from "react";

interface DeepgramContextType {
  connection: LiveClient | null;
  connectToDeepgram: (options: LiveSchema, endpoint?: string) => Promise<void>;
  disconnectFromDeepgram: () => void;
  connectionState: LiveConnectionState;
}

const DeepgramContext = createContext<DeepgramContextType | undefined>(
  undefined
);

interface DeepgramContextProviderProps {
  children: ReactNode;
}

export const DeepgramContextProvider: FunctionComponent<DeepgramContextProviderProps> = ({ 
  children 
}) => {
  const [connection, setConnection] = useState<LiveClient | null>(null);
  const [connectionState, setConnectionState] = useState<LiveConnectionState>(
    LiveConnectionState.CLOSED
  );

  const getApiKey = async (): Promise<string> => {
    const response = await fetch("/api/deepgram-key");
    const data = await response.json();
    if (!data.key) throw new Error('Failed to get API key');
    return data.key;
  };

  const connectToDeepgram = async (options: LiveSchema) => {
    try {
      const apiKey = await getApiKey();
      const deepgram = createClient(apiKey);
      const newConnection = deepgram.listen.live(options);

      newConnection.on(LiveTranscriptionEvents.Open, () => {
        setConnectionState(LiveConnectionState.OPEN);
      });

      newConnection.on(LiveTranscriptionEvents.Close, () => {
        setConnectionState(LiveConnectionState.CLOSED);
      });

      newConnection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('Deepgram connection error:', error);
        setConnectionState(LiveConnectionState.CLOSED);
      });

      setConnection(newConnection);
    } catch (error) {
      console.error('Error connecting to Deepgram:', error);
      throw error;
    }
  };

  const disconnectFromDeepgram = () => {
    if (connection) {
      connection.finish();
      setConnection(null);
      setConnectionState(LiveConnectionState.CLOSED);
    }
  };

  return (
    <DeepgramContext.Provider
      value={{
        connection,
        connectToDeepgram,
        disconnectFromDeepgram,
        connectionState,
      }}
    >
      {children}
    </DeepgramContext.Provider>
  );
};

export function useDeepgram(): DeepgramContextType {
  const context = useContext(DeepgramContext);
  if (context === undefined) {
    throw new Error(
      "useDeepgram must be used within a DeepgramContextProvider"
    );
  }
  return context;
}

export {
  LiveConnectionState,
  LiveTranscriptionEvents,
  type LiveTranscriptionEvent,
};
