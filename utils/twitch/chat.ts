export async function sendTwitchMessage(broadcasterId: string, message: string) {
    try {
        const response = await fetch('/api/twitch/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                broadcasterId,
                message
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending Twitch message:', error);
        throw error;
    }
} 