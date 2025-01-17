export const TRANSCRIPTION = {
  CAPTION_TIMEOUT: 3000,   // 3 seconds
  KEEP_ALIVE_INTERVAL: 10000 // 10 seconds
} as const;

export const DEEPGRAM = {
  OPTIONS: {
    MODEL: "nova-2",
    CAPTION_TIMEOUT: 3000,
    UTTERANCE_END_MS: 2000,
    INTERIM_RESULTS: true,
    SMART_FORMAT: true,
    FILLER_WORDS: true,
    VAD_EVENTS: false
  }
} as const;

export const TWITCH = {
  SCOPES: 'channel:read:subscriptions channel:manage:broadcast chat:read chat:edit user:write:chat user:read:chat channel:bot'
} as const;

export const CHAT = {
  INTERACTION_COOLDOWN: 10 * 1000, // 10 seconds
  MESSAGE_CONTEXT_SIZE: 10,
  RESPONSE_DELAY: 2000, // 2 seconds delay before responding
  CONTEXT_SIZE: 3,
  SAVE_DELAY: 2000 // 2 seconds delay before saving
} as const;

export const STREAM_SETTINGS = {
  DEFAULT_COOLDOWN: 6, // seconds
  DEFAULT_PROMPT: 'You are ViewerAIBot, a friendly chat bot engaging with Twitch chat and the streamer, {STREAMER_NAME}. Respond using emojis and twitch messages. When asked a question, answer it directly. Occasionally roast the chatters and/or the streamer. ',
  GLOBAL_PROMPT: 'Based on the recent messages, generate a natural, engaging response. Respond naturally as a Twitch chat bot. Keep responses short (1-3 lines). Do not respond to yourself. Prioritize responding to the most recent messages first. Avoid any metadata formatting aside from the response, and do not repeat your own name or prefix responses with your name (ViewerAIBot). ',
  DEFAULT_IS_LIVE: false,
  MAX_PERSONALITY_LENGTH: 750 // maximum characters for bot personality prompt
} as const;

export const OPENAI = {
  MODEL: "google/gemini-flash-1.5-8b-exp",
  MAX_TOKENS: 100,
  TEMPERATURE: 0.7
} as const;

export const RATE_LIMIT = {
  WINDOW_MS: 60 * 1000, // 1 minute
  MAX_REQUESTS: 30 // 30 requests per minute
} as const;

export const TOKEN = {
  BUFFER_TIME_SECONDS: 60, // 1 minute buffer
  ERRORS: {
    MISSING_CREDENTIALS: 'Missing Twitch credentials',
    UNAUTHORIZED: 'Unauthorized',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    FETCH_FAILED: 'Failed to get token'
  }
} as const;