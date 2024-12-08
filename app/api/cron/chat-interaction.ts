import { getActiveStreamSettings, getChatHistory, updateLastInteraction } from '@/utils/supabase/admin';
import { sendTwitchMessage } from '@/utils/twitch/chat';
import OpenAI from 'openai';

// Add ChatMessage type
type ChatMessage = {
    text: string;
    chatter_user_name: string;
};

const INTERACTION_COOLDOWN = 10 * 1000; // 10 seconds
const MESSAGE_CONTEXT_SIZE = 10; // Last 10 messages

function shouldInteract(lastInteractionTime: string | null): boolean {
    // If no last interaction, we should interact
    if (!lastInteractionTime) {
        return true;
    }

    const now = Date.now();
    const lastInteraction = new Date(lastInteractionTime).getTime();
    const timeSinceLastInteraction = now - lastInteraction;

    // Return true if enough time has passed since last interaction
    return timeSinceLastInteraction >= INTERACTION_COOLDOWN;
}

export async function POST(request: Request) {
    try {
        console.log('Starting periodic chat interactions...');
        const activeStreamSettings = await getActiveStreamSettings();
        console.log(`Found ${activeStreamSettings.length} active streams`);

        for (const stream of activeStreamSettings) {
            console.log(`Processing stream for platform_user_id: ${stream.platform_user_id}`);

            if (shouldInteract(stream.last_interaction)) {
                console.log('Cooldown passed, fetching recent messages...');
                const messages = await getChatHistory(stream.platform_user_id!, MESSAGE_CONTEXT_SIZE);
                const formattedMessages: ChatMessage[] = messages
                    .filter(m => m.chatter_user_name && m.text)
                    .map(m => ({
                        text: m.text,
                        chatter_user_name: m.chatter_user_name!
                    }));

                // Generate AI response
                const response = await generateAIResponse(formattedMessages);

                // Send message using new chat utility
                if (stream.platform_user_id && response) {
                    await sendTwitchMessage(
                        stream.platform_user_id,
                        response
                    );
                }

                // Update last interaction timestamp
                await updateLastInteraction(stream.platform_user_id!);
            }
        }

        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Failed to process periodic chat interactions:', error);
        return new Response('Error', { status: 500 });
    }
}

async function generateAIResponse(messages: ChatMessage[]) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `You are a friendly chat bot engaging with Twitch chat. 
        Based on the recent messages, generate a natural, engaging response.
        Recent context: ${messages.map(m => `${m.chatter_user_name}: ${m.text}`).join('\n')}`;

    const completion = await openai.chat.completions.create({
        messages: [{ role: 'system', content: prompt }],
        model: "gpt-3.5-turbo",
        max_tokens: 100,
        temperature: 0.7
    });

    return completion.choices[0].message.content;
} 