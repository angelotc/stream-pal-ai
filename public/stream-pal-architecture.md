graph TD
    subgraph Frontend
        MessagesForm[MessagesForm Component]
        UI[UI Components]
        DeepgramContext[DeepgramContext Provider]
        MicrophoneContext[MicrophoneContext Provider]
    end

    subgraph API_Routes
        ChatAPI["API: /api/chat"]
        TwitchAPI["API: /api/twitch"]
        AuthAPI["API: /api/auth"]
        StripeAPI["API: /api/stripe"]
        DeepgramAPI["API: /api/deepgram"]
    end

    subgraph Utils
        Messages[messages.ts]
        TwitchUtils[twitch/*.ts]
        SupabaseUtils[supabase/*.ts]
        StripeUtils[stripe/*.ts]
    end

    subgraph External_Services
        Twitch[(Twitch API)]
        Supabase[(Supabase DB)]
        Stripe[(Stripe)]
        OpenAI[(OpenAI)]
        Deepgram[(Deepgram API)]
    end

    MessagesForm -->|Sends transcripts| ChatAPI
    MessagesForm -->|Real-time updates| Supabase
    UI -->|Auth requests| AuthAPI
    UI -->|Payment| StripeAPI

    DeepgramContext -->|Audio streaming| Deepgram
    MicrophoneContext -->|Audio input| DeepgramContext
    MessagesForm -->|Uses contexts| DeepgramContext
    MessagesForm -->|Uses contexts| MicrophoneContext

    DeepgramAPI -->|Key management| Deepgram
    ChatAPI -->|Message handling| Messages
    TwitchAPI -->|Chat & webhooks| TwitchUtils
    StripeAPI -->|Payment processing| StripeUtils

    TwitchUtils -->|Chat & Events| Twitch
    SupabaseUtils -->|Data operations| Supabase
    StripeUtils -->|Payments| Stripe
    ChatAPI -->|AI responses| OpenAI

    Messages -->|Data storage| SupabaseUtils
    TwitchUtils -->|User data| SupabaseUtils
    StripeUtils -->|Customer data| SupabaseUtils

    Middleware{Middleware} -->|Session management| SupabaseUtils
    
    classDef api fill:#f9f,stroke:#333,stroke-width:2px
    classDef component fill:#bbf,stroke:#333,stroke-width:2px
    classDef external fill:#bfb,stroke:#333,stroke-width:2px
    classDef context fill:#fbb,stroke:#333,stroke-width:2px
    
    class ChatAPI,TwitchAPI,AuthAPI,StripeAPI,DeepgramAPI api
    class MessagesForm,UI component
    class Twitch,Supabase,Stripe,OpenAI,Deepgram external
    class DeepgramContext,MicrophoneContext context