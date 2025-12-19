import { google } from "googleapis";
import { prisma } from "./prisma";

// Gmail OAuth configuration
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;
const GMAIL_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
  : "http://localhost:3000/api/auth/gmail/callback";

// Scopes needed for sending emails
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

// Create OAuth2 client
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI
  );
}

// Generate OAuth URL for user consent
export function getGmailAuthUrl(userId: string) {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: userId, // Pass userId to identify user in callback
  });
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Get user's email address from Google
export async function getGmailUserEmail(accessToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  
  return data.email;
}

// Refresh access token if expired
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

// Get valid access token (refreshes if needed)
export async function getValidAccessToken(emailAccountId: string) {
  const account = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
  });

  if (!account) {
    throw new Error("Email account not found");
  }

  // Check if token is expired (with 5 min buffer)
  const isExpired = new Date(account.expiresAt) < new Date(Date.now() + 5 * 60 * 1000);

  if (isExpired) {
    // Refresh the token
    const newCredentials = await refreshAccessToken(account.refreshToken);
    
    // Update in database
    await prisma.emailAccount.update({
      where: { id: emailAccountId },
      data: {
        accessToken: newCredentials.access_token!,
        expiresAt: new Date(newCredentials.expiry_date!),
      },
    });

    return newCredentials.access_token!;
  }

  return account.accessToken;
}

// Send email via Gmail API
export async function sendGmailEmail({
  emailAccountId,
  to,
  subject,
  body,
}: {
  emailAccountId: string;
  to: string;
  subject: string;
  body: string;
}) {
  const account = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
  });

  if (!account) {
    throw new Error("Email account not found");
  }

  const accessToken = await getValidAccessToken(emailAccountId);
  
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Create email message
  const emailLines = [
    `From: ${account.email}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    "",
    `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="white-space: pre-wrap;">${body}</div>
    </div>`,
  ];

  const email = emailLines.join("\r\n");
  const encodedEmail = Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedEmail,
    },
  });

  return {
    success: true,
    messageId: result.data.id,
    threadId: result.data.threadId,
  };
}

// Get user's connected email accounts
export async function getUserEmailAccounts(userId: string) {
  return prisma.emailAccount.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      email: true,
      isDefault: true,
      createdAt: true,
    },
  });
}

// Disconnect email account
export async function disconnectEmailAccount(userId: string, accountId: string) {
  const account = await prisma.emailAccount.findFirst({
    where: { id: accountId, userId },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  await prisma.emailAccount.delete({
    where: { id: accountId },
  });

  return { success: true };
}

// Set default email account
export async function setDefaultEmailAccount(userId: string, accountId: string) {
  // Remove default from all accounts
  await prisma.emailAccount.updateMany({
    where: { userId },
    data: { isDefault: false },
  });

  // Set new default
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: { isDefault: true },
  });

  return { success: true };
}

// Get user's default email account
export async function getDefaultEmailAccount(userId: string) {
  return prisma.emailAccount.findFirst({
    where: { userId, isDefault: true },
  });
}

