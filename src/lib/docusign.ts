/**
 * DocuSign Integration
 *
 * OAuth flow, token management, and eSignature API client.
 * Mirrors the Gmail OAuth pattern in src/lib/gmail.ts.
 */

import { prisma } from "./prisma";
import * as Sentry from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DOCUSIGN_CLIENT_ID = process.env.DOCUSIGN_CLIENT_ID!;
const DOCUSIGN_CLIENT_SECRET = process.env.DOCUSIGN_CLIENT_SECRET!;
const DOCUSIGN_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/docusign/callback`
  : "http://localhost:3000/api/auth/docusign/callback";

// Use demo environment unless DOCUSIGN_PRODUCTION is set
const IS_PRODUCTION = process.env.DOCUSIGN_PRODUCTION === "true";
const AUTH_BASE = IS_PRODUCTION
  ? "https://account.docusign.com"
  : "https://account-d.docusign.com";
const API_BASE_FALLBACK = IS_PRODUCTION
  ? "https://na1.docusign.net"
  : "https://demo.docusign.net";

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

export function getDocuSignAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    scope: "signature",
    client_id: DOCUSIGN_CLIENT_ID,
    redirect_uri: DOCUSIGN_REDIRECT_URI,
    state: userId,
  });
  return `${AUTH_BASE}/oauth/auth?${params.toString()}`;
}

export async function exchangeDocuSignCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${DOCUSIGN_CLIENT_ID}:${DOCUSIGN_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: DOCUSIGN_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DocuSign token exchange failed: ${text}`);
  }

  return response.json();
}

export async function refreshDocuSignToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${DOCUSIGN_CLIENT_ID}:${DOCUSIGN_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DocuSign token refresh failed: ${text}`);
  }

  return response.json();
}

export async function getDocuSignUserInfo(accessToken: string): Promise<{
  accountId: string;
  baseUri: string;
  email: string;
  name: string;
}> {
  const response = await fetch(`${AUTH_BASE}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error("Failed to get DocuSign user info");

  const data = await response.json();
  const account = data.accounts?.[0];

  return {
    accountId: account?.account_id ?? "",
    baseUri: account?.base_uri ?? API_BASE_FALLBACK,
    email: data.email ?? "",
    name: data.name ?? "",
  };
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

export async function getValidDocuSignToken(
  docuSignAccountId: string
): Promise<{ accessToken: string; baseUri: string; accountId: string }> {
  const account = await prisma.docuSignAccount.findUnique({
    where: { id: docuSignAccountId },
  });

  if (!account) throw new Error("DocuSign account not found");

  // Refresh if expired or expiring in next 5 minutes
  if (account.expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    const tokens = await refreshDocuSignToken(account.refreshToken);

    await prisma.docuSignAccount.update({
      where: { id: docuSignAccountId },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return {
      accessToken: tokens.access_token,
      baseUri: account.baseUri,
      accountId: account.accountId,
    };
  }

  return {
    accessToken: account.accessToken,
    baseUri: account.baseUri,
    accountId: account.accountId,
  };
}

// ---------------------------------------------------------------------------
// eSignature API
// ---------------------------------------------------------------------------

interface Signer {
  name: string;
  email: string;
}

export interface SendEnvelopeOptions {
  docuSignAccountId: string;
  subject: string;
  signers: Signer[];
  documentUrl?: string;
  dealId?: string;
}

export async function sendEnvelope(options: SendEnvelopeOptions): Promise<{
  envelopeId: string;
  status: string;
}> {
  const { accessToken, baseUri, accountId } = await getValidDocuSignToken(
    options.docuSignAccountId
  );

  // Build envelope definition
  const signerDefs = options.signers.map((s, i) => ({
    email: s.email,
    name: s.name,
    recipientId: String(i + 1),
    routingOrder: String(i + 1),
  }));

  const envelopeDefinition: Record<string, unknown> = {
    emailSubject: options.subject,
    recipients: { signers: signerDefs },
    status: "sent",
  };

  // If a document URL is provided, fetch and attach it
  if (options.documentUrl) {
    const docResponse = await fetch(options.documentUrl);
    const docBuffer = Buffer.from(await docResponse.arrayBuffer());
    envelopeDefinition.documents = [
      {
        documentBase64: docBuffer.toString("base64"),
        name: "Document",
        fileExtension: "pdf",
        documentId: "1",
      },
    ];
  } else {
    // Create a placeholder signing document
    envelopeDefinition.documents = [
      {
        documentBase64: Buffer.from(
          `<html><body><h1>${options.subject}</h1><p>Please sign below.</p></body></html>`
        ).toString("base64"),
        name: "Agreement",
        fileExtension: "html",
        documentId: "1",
      },
    ];
  }

  const apiUrl = `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(envelopeDefinition),
  });

  if (!response.ok) {
    const text = await response.text();
    Sentry.captureMessage(`DocuSign sendEnvelope failed: ${text}`, {
      level: "error",
      tags: { component: "docusign" },
    });
    throw new Error(`DocuSign API error: ${response.status}`);
  }

  const result = await response.json();

  // Persist envelope record
  await prisma.docuSignEnvelope.create({
    data: {
      docuSignAccountId: options.docuSignAccountId,
      envelopeId: result.envelopeId,
      dealId: options.dealId ?? null,
      status: result.status ?? "sent",
      subject: options.subject,
      recipients: JSON.parse(JSON.stringify(options.signers)),
      sentAt: new Date(),
    },
  });

  return {
    envelopeId: result.envelopeId,
    status: result.status,
  };
}

export async function getEnvelopeStatus(
  docuSignAccountId: string,
  envelopeId: string
): Promise<{
  status: string;
  recipients: Array<{ name: string; email: string; status: string; signedAt?: string }>;
}> {
  const { accessToken, baseUri, accountId } = await getValidDocuSignToken(
    docuSignAccountId
  );

  const apiUrl = `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}`;
  const recipientsUrl = `${apiUrl}/recipients`;

  const [envRes, recipRes] = await Promise.all([
    fetch(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } }),
    fetch(recipientsUrl, { headers: { Authorization: `Bearer ${accessToken}` } }),
  ]);

  if (!envRes.ok) throw new Error(`Failed to get envelope status: ${envRes.status}`);

  const envData = await envRes.json();
  const recipData = recipRes.ok ? await recipRes.json() : { signers: [] };

  const recipients = (recipData.signers ?? []).map(
    (s: { name: string; email: string; status: string; signedDateTime?: string }) => ({
      name: s.name,
      email: s.email,
      status: s.status,
      signedAt: s.signedDateTime,
    })
  );

  return {
    status: envData.status,
    recipients,
  };
}

// ---------------------------------------------------------------------------
// Helper: get user's DocuSign account
// ---------------------------------------------------------------------------

export async function getDefaultDocuSignAccount(userId: string) {
  return prisma.docuSignAccount.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
