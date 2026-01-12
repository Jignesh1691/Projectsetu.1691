/**
 * VAPID key management for Web Push notifications
 */

/**
 * Get VAPID public key from environment
 */
export function getVapidPublicKey(): string {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!key) {
        throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
    }

    return key;
}

/**
 * Get VAPID private key from environment (server-side only)
 */
export function getVapidPrivateKey(): string {
    const key = process.env.VAPID_PRIVATE_KEY;

    if (!key) {
        throw new Error('VAPID_PRIVATE_KEY is not set');
    }

    return key;
}

/**
 * Get VAPID subject (email) from environment
 */
export function getVapidSubject(): string {
    const subject = process.env.VAPID_SUBJECT;

    if (!subject) {
        throw new Error('VAPID_SUBJECT is not set');
    }

    return subject;
}

/**
 * Generate VAPID keys - Run this once to generate keys for your app
 * Usage: node -e "require('./lib/notifications/vapid').generateVapidKeys()"
 */
export async function generateVapidKeys(): Promise<{
    publicKey: string;
    privateKey: string;
}> {
    try {
        const webpush = await import('web-push');
        const vapidKeys = webpush.generateVAPIDKeys();

        console.log('\n=== VAPID Keys Generated ===');
        console.log('\nAdd these to your .env file:\n');
        console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
        console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
        console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);
        console.log('\n===========================\n');

        return vapidKeys;
    } catch (error) {
        console.error('Failed to generate VAPID keys. Make sure web-push is installed:');
        console.error('npm install web-push');
        throw error;
    }
}

/**
 * URL-safe Base64 encoding (required for push subscriptions)
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}
