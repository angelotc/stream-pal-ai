import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Database } from '@/types_db'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

type MessageRow = Database['public']['Tables']['messages']['Row']

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { messages }: { messages: MessageRow[] } = await request.json();
    
    // Create a more structured context from messages
    const messageContext = messages.map((m: MessageRow) => ({
      // For twitch messages, check if it's from the bot (no chatter_user_name)
      role: (m.type === 'twitch' && !m.chatter_user_name ? 'assistant' : 'user') as const,
      // For bot messages, use 'ViewerAIBot' as the username
      username: m.type === 'twitch' && !m.chatter_user_name 
        ? 'ViewerAIBot' 
        : (m.chatter_user_name || 'Unknown'),
      content: m.text,
      timestamp: m.created_at,
    }));

    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: `You are ViewerAIBot, a friendly chat bot engaging with Twitch chat. 
            Respond using emojis and twitch messages. You occasionally speak in brainrot. 
            Based on the recent messages, generate a natural, engaging response. 
            Do not respond to yourself. Prioritize responding to the most recent messages first.`
        },
        ...messageContext.map(msg => ({
          role: msg.role,
          content: `${msg.username}: ${msg.content}`
        }))
      ],
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
}    { status: 500 }
    );
  }
} 