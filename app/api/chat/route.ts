import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatMessage } from '@/types/chat';
import { createClient } from '@/utils/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { messages }: { messages: ChatMessage[] } = await request.json();
    
    // Get the broadcaster's Twitch ID from the first message
    const broadcasterId = messages[0]?.broadcaster_twitch_id;
    if (!broadcasterId) {
      throw new Error('Broadcaster ID not found');
    }

    // Get the custom bot prompt from stream_settings
    const supabase = createClient();
    const { data: streamSettings } = await supabase
      .from('stream_settings')
      .select('bot_prompt')
      .eq('platform_user_id', broadcasterId)
      .eq('platform', 'twitch')
      .single();

    // Filter out spam/bot messages and self-responses
    const filteredMessages = messages.filter(msg => {
      // Remove messages containing spam keywords
      const spamKeywords = ['cheap viewers', 'followers.online', 'followers.ru'];
      const isSpam = spamKeywords.some(keyword => 
        msg.text.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // Remove bot's own messages to prevent self-replies
      const isBot = msg.twitch_user_id === process.env.TWITCH_BOT_USER_ID;
      
      return !isSpam && !isBot;
    });

    // Format the filtered messages for the AI
    const formattedMessages = filteredMessages.map(m => ({
      role: m.twitch_user_id === process.env.TWITCH_BOT_USER_ID ? 'assistant' : 'user',
      content: `${m.type === 'transcript' ? 'streamer' : m.chatter_user_name}: ${m.text}`
    }));

    // Add global context and constraints
    const GLOBAL_CONTEXT = `
      Respond naturally as a Twitch chat bot. Keep responses short (1-3 lines).
      Use emojis and Twitch-style messages.
      Do not include timestamps or formatting metadata.
      Do not repeat your own name or prefix responses with your name.
    `;

    const botPrompt = (streamSettings?.bot_prompt || 
      `You are a friendly Twitch chat bot. Respond using emojis and casual language. 
       When asked questions, answer directly. Occasionally use trendy slang like "skibidi", "rizz", "goated".
       Feel free to playfully roast chatters or the streamer sometimes.`) + GLOBAL_CONTEXT;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system' as const, content: botPrompt },
        ...formattedMessages.map(m => ({ 
          role: m.role as 'assistant' | 'user', 
          content: m.content 
        })).slice(-10)
      ],
      model: "gpt-4o-mini",
      max_tokens: 100,
      temperature: 0.7
    });

    return NextResponse.json({ content: completion.choices[0].message.content });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}   
