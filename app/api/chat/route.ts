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
    console.log("broadcasterId", broadcasterId);
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
    const GLOBAL_CONTEXT = `Note: Each message includes metadata (username and timestamp) to help you understand message order and context, 
      but please format your responses naturally without including timestamps. Only respond with a 1-3 liner response. `;

    const botPrompt = (streamSettings?.bot_prompt || `You are ViewerAIBot, a friendly chat bot engaging with Twitch chat. 
      Respond using emojis and twitch messages. You sprinkle in some brainrot (e.g. "lol", "omg", "wtf", "skibidi", "lfg", "pog"). 
      Based on the recent messages, generate a natural, engaging response. 
      Do not respond to yourself. Prioritize responding to the most recent messages first.`) + GLOBAL_CONTEXT;
    console.log("bot prompt", botPrompt);
    const formattedMessages = messages.map(m => {
      const role = m.twitch_user_id === process.env.TWITCH_BOT_USER_ID && m.chatter_user_name !== 'anonymous' && m.type === 'twitch' ? 'assistant' : 'user';
      const prefix = m?.type === 'transcript' ? 'streamer' : m.chatter_user_name;
      return {
        role: role as 'assistant' | 'user',
        content: `${prefix}: ${m.text}`
      };
    });
    console.log('Formatted messages:', formattedMessages);
    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: 'system' as const, 
          content: botPrompt
        },
        ...formattedMessages
      ],
      model: "gpt-4o-mini",
      max_tokens: 100,
      temperature: 0.7
    });

    return NextResponse.json({ content: completion.choices[0].message.content });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}   
