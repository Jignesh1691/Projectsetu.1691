import { Resend } from 'resend';
import { getInviteTemplate, getVerificationEmailTemplate, getPasswordResetEmailTemplate } from './email-templates';



const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInviteEmail({
    email,
    orgName,
    inviteLink,
}: {
    email: string;
    orgName: string;
    inviteLink: string;
}) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Project Setu <noreply@updates.projectsetu.in>',
            to: email,
            subject: `Invitation to join ${orgName} on Project Setu`,
            html: getInviteTemplate({ orgName, inviteLink }),
        });

        if (error) {
            console.error('Resend API error:', error);
            throw new Error('Failed to send invite email.');
        }

        return data;
    } catch (error) {
        console.error('Error in sendInviteEmail:', error);
        throw error;
    }
}

export async function sendVerificationEmail({
    email,
    verificationLink,
}: {
    email: string;
    verificationLink: string;
}) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Project Setu <noreply@updates.projectsetu.in>',
            to: email,
            subject: 'Verify your email address - Project Setu',
            html: getVerificationEmailTemplate(verificationLink),
        });

        if (error) {
            console.error('Resend API error:', error);
            throw new Error('Failed to send verification email.');
        }

        return data;
    } catch (error) {
        console.error('Error in sendVerificationEmail:', error);
        throw error;
    }
}

export async function sendPasswordResetEmail({
    email,
    resetLink,
}: {
    email: string;
    resetLink: string;
}) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Project Setu <noreply@updates.projectsetu.in>',
            to: email,
            subject: 'Reset your password - Project Setu',
            html: getPasswordResetEmailTemplate(resetLink),
        });

        if (error) {
            console.error('Resend API error:', error);
            throw new Error('Failed to send password reset email.');
        }

        return data;
    } catch (error) {
        console.error('Error in sendPasswordResetEmail:', error);
        throw error;
    }
}
