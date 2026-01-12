/**
 * Base email template with consistent styling for Project Setu
 */
const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Setu</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      background-color: #2563eb;
      padding: 32px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .body {
      padding: 40px 32px;
    }
    .footer {
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      background-color: #f3f4f6;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 24px;
    }
    .link-alt {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 32px;
      word-break: break-all;
    }
    p { margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Project Setu</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; 2025 Project Setu. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export function getMagicLinkTemplate(url: string) {
  return baseTemplate(`
    <h2>Sign in to your account</h2>
    <p>We received a request to sign in to your Project Setu account. Click the button below to sign in instantly:</p>
    <a href="${url}" class="button">Sign in to Project Setu</a>
    <p style="margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
    <div class="link-alt">
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      ${url}
    </div>
  `);
}

export function getInviteTemplate({ orgName, inviteLink }: { orgName: string; inviteLink: string }) {
  return baseTemplate(`
    <h2>You've been invited!</h2>
    <p>You have been invited to join <strong>${orgName}</strong> on Project Setu.</p>
    <p>Click the button below to accept the invitation and get started:</p>
    <a href="${inviteLink}" class="button">Accept Invitation</a>
    <p style="margin-top: 24px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
    <div class="link-alt">
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      ${inviteLink}
    </div>
  `);
}
export function getVerificationEmailTemplate(url: string) {
  return baseTemplate(`
    <h2>Verify your email address</h2>
    <p>Thanks for signing up for Project Setu! Please verify your email address by clicking the button below:</p>
    <a href="${url}" class="button">Verify Email Address</a>
    <p style="margin-top: 24px;">If you didn't create an account, you can safely ignore this email.</p>
    <div class="link-alt">
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      ${url}
    </div>
  `);
}
export function getPasswordResetEmailTemplate(url: string) {
  return baseTemplate(`
    <h2>Reset your password</h2>
    <p>We received a request to reset the password for your Project Setu account. Click the button below to set a new password:</p>
    <a href="${url}" class="button">Reset Password</a>
    <p style="margin-top: 24px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    <div class="link-alt">
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      ${url}
    </div>
  `);
}
