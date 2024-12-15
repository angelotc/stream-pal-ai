import { TwitchSubscription } from '@/types/twitch';
import { subscribeToEvent } from '../webhook/subscriptions';

export async function manageTwitchSubscriptions(userId: string, botEnabled: boolean, accessToken: string) {
    const headers = {
        'Client-ID': process.env.TWITCH_CLIENT_ID!,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };

    const existingSubs = await getExistingSubscriptions(userId, headers);
    
    if (botEnabled) {
        await enableSubscriptions(userId, existingSubs, headers);
    } else {
        await disableSubscriptions(existingSubs, headers);
    }
    
    return true;
}

async function getExistingSubscriptions(userId: string, headers: Record<string, string>) {
    const response = await fetch(`https://api.twitch.tv/helix/eventsub/subscriptions?user_id=${userId}`, {
        headers
    });
    const data = await response.json();
    return data.data as TwitchSubscription[];
}

async function enableSubscriptions(userId: string, existingSubs: TwitchSubscription[], headers: Record<string, string>) {
    const hasOnlineSub = existingSubs?.some(sub => sub.type === 'stream.online');
    const hasOfflineSub = existingSubs?.some(sub => sub.type === 'stream.offline');

    const needed = [];
    if (!hasOnlineSub) needed.push(subscribeToEvent('stream.online', userId, headers['Authorization'].split(' ')[1]));
    if (!hasOfflineSub) needed.push(subscribeToEvent('stream.offline', userId, headers['Authorization'].split(' ')[1]));
    
    if (needed.length) await Promise.all(needed);
}

async function disableSubscriptions(existingSubs: TwitchSubscription[], headers: Record<string, string>) {
    const deletePromises = existingSubs.map(sub =>
        fetch(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${sub.id}`, {
            method: 'DELETE',
            headers
        })
    );
    
    await Promise.all(deletePromises);
} 