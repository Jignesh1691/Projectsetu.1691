const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
    console.log('Testing Resend Email...');
    console.log('API KEY length:', process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 'MISSING');

    try {
        const { data, error } = await resend.emails.send({
            from: 'Project Setu <noreply@updates.projectsetu.in>',
            to: 'delivered@resend.dev', // Testing with Resend's test address if not verified
            subject: 'Test Email from Project Setu',
            html: '<p>This is a test email.</p>',
        });

        if (error) {
            console.error('Email Error:', error);
        } else {
            console.log('Email Sent Successfully:', data);
        }
    } catch (e) {
        console.error('Unexpected Error:', e);
    }
}

testEmail();
