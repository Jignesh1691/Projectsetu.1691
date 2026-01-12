const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('--- NEW VAPID KEYS GENERATED ---');
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
console.log('---------------------------------');
console.log('Update your .env file with these values.');
