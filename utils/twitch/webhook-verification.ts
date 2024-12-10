import crypto from 'crypto';

export function verifyWebhookSignature(
    messageId: string | null,
    timestamp: string | null,
    signature: string | null,
    body: string
): boolean {
    if (!messageId || !timestamp || !signature) {
        return false;
    }

    const hmacMessage = messageId + timestamp + body;
    const hmac = 'sha256=' + crypto
        .createHmac('sha256', process.env.TWITCH_WEBHOOK_SECRET!)
        .update(hmacMessage)
        .digest('hex');

    return hmac === signature;
} 