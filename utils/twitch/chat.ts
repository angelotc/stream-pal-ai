import { CHAT } from "@/config/constants";

export function formatMessagesForAI(messages: any[]) {
    return messages.map(m => ({
        text: m.text ?? '',
        type: m.type,
        chatter_user_name: m.chatter_user_name ?? 'anonymous',
        twitch_user_id: m.users?.twitch_user_id ?? 'unknown',
        created_at: m.created_at,
        broadcaster_twitch_id: m.broadcaster_twitch_id
    }));
}

export function shouldInteract(lastInteractionTime: string | null): boolean {
    if (!lastInteractionTime) return true;
    const now = Date.now();
    const lastInteraction = new Date(lastInteractionTime).getTime();
    return (now - lastInteraction) >= CHAT.INTERACTION_COOLDOWN;
} 