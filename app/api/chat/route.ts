import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatMessage } from '@/types/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { messages }: { messages: ChatMessage[] } = await request.json();
    
    const formattedMessages = messages.map(m => {
      const role = m.twitch_user_id === process.env.TWITCH_BOT_USER_ID ? 'assistant' : 'user';
      return {
        role: role as 'assistant' | 'user',
        content: `${m.created_at} - ${m.chatter_user_name}: ${m.text}`
      };
    });

    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: 'system' as const, 
          content: `You are ViewerAIBot, a friendly chat bot engaging with Twitch chat. 
            Respond using emojis and twitch messages. You occasionally speak in brainrot. 
            Based on the recent messages, generate a natural, engaging response. 
            Do not respond to yourself. Prioritize responding to the most recent messages first.`
        },
        ...formattedMessages
      ],
      model: "gpt-3.5-turbo",
      max_tokens: 100,
      temperature: 0.7
    });

    return NextResponse.json({ content: completion.choices[0].message.content });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}   
