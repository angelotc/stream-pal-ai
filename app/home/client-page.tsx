// app/home/client-page.tsx
'use client';

import TranscriptionForm from '@/components/ui/AccountForms/TranscriptionForm';
import { DeepgramContextProvider } from '@/context/DeepgramContextProvider';
import { MicrophoneContextProvider } from '@/context/MicrophoneContextProvider';

export default function ClientHome() {
  return (
    <DeepgramContextProvider>
      <MicrophoneContextProvider>
        <section className="mb-32 bg-black">
          <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
            <div className="sm:align-center sm:flex sm:flex-col">
              <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
                Home
              </h1>
              <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-2xl">
                Make sure you are live on Twitch before you start transcribing.
              </p>
            </div>
          </div>
          <div className="p-4">
            <TranscriptionForm />
          </div>
        </section>
      </MicrophoneContextProvider>
    </DeepgramContextProvider>
  );
}