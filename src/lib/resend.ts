import type { Resend } from "resend";

let _resend: Resend | null = null;

export async function getResend(): Promise<Resend> {
  if (!_resend) {
    const { Resend: ResendClient } = await import("resend");
    _resend = new ResendClient(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// Email templates
export interface EmailTemplateProps {
  to: string;
  subject: string;
  contactName: string;
}

export interface PropertyEmailProps extends EmailTemplateProps {
  properties: Array<{
    address: string;
    city: string;
    price: number;
    bedrooms?: number;
    bathrooms?: number;
    imageUrl?: string;
  }>;
}

export interface FollowUpEmailProps extends EmailTemplateProps {
  message: string;
  agentName?: string;
  agentPhone?: string;
}

