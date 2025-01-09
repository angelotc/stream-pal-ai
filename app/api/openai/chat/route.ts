import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatMessage } from '@/types/chat';
import { createClient } from '@/utils/supabase/server';
import { STREAM_SETTINGS, OPENAI, CHAT } from "@/config/constants";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});

export async function POST(request: Request) {
  try {
    const { 
      messages, 
      priorityMessage 
    }: { 
      messages: ChatMessage[], 
      priorityMessage?: ChatMessage 
    } = await request.json();
    
    console.log('Received request:', { 
      messageCount: messages.length,
      hasPriorityMessage: !!priorityMessage
    });
    
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
    console.log("formattedMessages", formattedMessages);


    const botPrompt = (streamSettings?.bot_prompt + STREAM_SETTINGS.GLOBAL_PROMPT);
    console.log("botPrompt", botPrompt);
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system' as const, content: botPrompt },
        // Add priority message context if it exists
        ...(priorityMessage ? [{
          role: 'system' as const,
          content: `Respond specifically to this message: "${priorityMessage.text}"`
        }] : []),
        ...formattedMessages.map(m => ({ 
          role: m.role as 'assistant' | 'user', 
          content: m.content 
        })).slice(-CHAT.CONTEXT_SIZE)  // Keep recent context
      ],
      model: OPENAI.MODEL,
      max_tokens: OPENAI.MAX_TOKENS,
      temperature: OPENAI.TEMPERATURE
    });

    return NextResponse.json({ content: completion.choices[0].message.content });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}   
