// Simple test to verify NextAuth is working
const testAuth = async () => {
    console.log('Testing authentication endpoint...');

    const response = await fetch('http://localhost:3000/api/auth/providers');
    const data = await response.json();

    console.log('Auth providers:', data);
    console.log('Status:', response.status);
};

testAuth().catch(console.error);
