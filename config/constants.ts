export const TRANSCRIPTION = {
  CAPTION_TIMEOUT: 3000,   // 3 seconds
  KEEP_ALIVE_INTERVAL: 10000 // 10 seconds
} as const;

export const DEEPGRAM = {
  OPTIONS: {
    MODEL: "nova-2",
    UTTERANCE_END_MS: 3000,
    interim_results: true,
    smart_format: true,
    filler_words: true,
    vad_events: true,
    endpointing: 500
  }
} as const;

export const CHAT = {
  INTERACTION_COOLDOWN: 10 * 1000, // 10 seconds
  MESSAGE_CONTEXT_SIZE: 10,
  RESPONSE_DELAY: 2000 // 2 seconds delay before responding
} as const;