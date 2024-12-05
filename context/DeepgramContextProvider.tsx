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

const DeepgramContextProvider: FunctionComponent<
  DeepgramContextProviderProps
> = ({ children }) => {
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

  /**
   * Connects to the Deepgram speech recognition service and sets up a live transcription session.
   *
   * @param options - The configuration options for the live transcription session.
   * @param endpoint - The optional endpoint URL for the Deepgram service.
   * @returns A Promise that resolves when the connection is established.
   */
  const connectToDeepgram = async (options: LiveSchema, endpoint?: string) => {
    try {
      const key = await getApiKey();
      const deepgram = createClient(key);
  
      const conn = deepgram.listen.live(options, endpoint);
  
      conn.addListener(LiveTranscriptionEvents.Error, (error) => {
        console.error('Deepgram connection error:', error);
        setConnectionState(LiveConnectionState.CLOSED);
      });
  
      conn.addListener(LiveTranscriptionEvents.Open, () => {
        setConnectionState(LiveConnectionState.OPEN);
      });
  
      conn.addListener(LiveTranscriptionEvents.Close, () => {
        setConnectionState(LiveConnectionState.CLOSED);
      });
  

  
      setConnection(conn);
    } catch (error) {
      console.error('Failed to connect to Deepgram:', error);
      setConnectionState(LiveConnectionState.CLOSED);
      throw error;
    }
  };

  const disconnectFromDeepgram = () => {
    if (connection) {
      try {
        connection.finish();
      } catch (error) {
        console.error('Error disconnecting from Deepgram:', error);
      } finally {
        setConnection(null);
        setConnectionState(LiveConnectionState.CLOSED);
      }
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

function useDeepgram(): DeepgramContextType {
  const context = useContext(DeepgramContext);
  if (context === undefined) {
    throw new Error(
      "useDeepgram must be used within a DeepgramContextProvider"
    );
  }
  return context;
}

export {
  DeepgramContextProvider,
  useDeepgram,
  LiveConnectionState,
  LiveTranscriptionEvents,
  type LiveTranscriptionEvent,
};
