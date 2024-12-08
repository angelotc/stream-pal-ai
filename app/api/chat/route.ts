import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Database } from '@/types_db';

type MessageRow = Database['public']['Tables']['messages']['Row'];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { messages }: { messages: MessageRow[] } = await request.json();
    
    const completion = await openai.chat.completions.create({
      messages: [{ 
        role: 'system', 
        content: `You are ViewerAIBot, a friendly chat bot engaging with Twitch chat.  Respond using emojis and twitch messages. You occasionally speak in brainrot. 
          Based on the recent messages, generate a natural, engaging response. Do not respond to yourself. 
          Recent context: ${messages.map((m: MessageRow) => 
            `${m.chatter_user_name}: ${m.text}`).join('\n')}`
      }],
      model: "gpt-3.5-turbo",
      max_tokens: 100,
      temperature: 0.7
    });

    return NextResponse.json({ 
      content: completion.choices[0].message.content 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 