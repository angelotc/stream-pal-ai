import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { NextResponse } from 'next/server';

// Add this type declaration at the top of your file
declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
  constructor();
}

interface WebSocketPair {
  socket: WebSocket;
  response: Response;
}

export const runtime = 'edge';
export async function GET(request: Request) {
  const upgradeHeader = request.headers.get('upgrade');
  if (upgradeHeader !== 'websocket') {
    return new NextResponse('Expected websocket', { status: 400 });
  }

  try {
    const { socket: server, response } = new WebSocketPair();
    const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY!);
    let keepAlive: NodeJS.Timeout;

    const setupDeepgram = () => {
      const deepgram = deepgramClient.listen.live({
        language: 'en',
        punctuate: true,
        smart_format: true,
        model: 'nova',
      });

      if (keepAlive) clearInterval(keepAlive);
      keepAlive = setInterval(() => {
        console.log('deepgram: keepalive');
        deepgram.keepAlive();
      }, 10 * 1000);

      deepgram.addListener(LiveTranscriptionEvents.Open, () => {
        console.log('deepgram: connected');

        deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
          console.log('deepgram: transcript received');
          server.send(JSON.stringify(data));
        });

        deepgram.addListener(LiveTranscriptionEvents.Close, () => {
          console.log('deepgram: disconnected');
          clearInterval(keepAlive);
          deepgram.finish();
        });

        deepgram.addListener(LiveTranscriptionEvents.Error, (error) => {
          console.error('deepgram: error received', error);
        });

        deepgram.addListener(LiveTranscriptionEvents.Warning, (warning) => {
          console.warn('deepgram: warning received', warning);
        });

        deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
          console.log('deepgram: metadata received');
          server.send(JSON.stringify({ metadata: data }));
        });
      });

      return deepgram;
    };

    let deepgram = setupDeepgram();

    server.addEventListener('message', (message) => {
      console.log('socket: client data received');

      if (deepgram.getReadyState() === 1) {
        console.log('socket: data sent to deepgram');
        deepgram.send(message.data);
      } else if (deepgram.getReadyState() >= 2) {
        console.log('socket: retrying connection to deepgram');
        deepgram.finish();
        deepgram.removeAllListeners();
        deepgram = setupDeepgram();
      } else {
        console.log('socket: data couldn\'t be sent to deepgram');
      }
    });

    server.addEventListener('close', () => {
      console.log('socket: client disconnected');
      deepgram.finish();
      deepgram.removeAllListeners();
      deepgram = null;
      clearInterval(keepAlive);
    });

    server.accept();

    return response;
  } catch (error) {
    console.error('Error in WebSocket handling:', error);
    return new NextResponse('WebSocket error', { status: 500 });
  }
}
