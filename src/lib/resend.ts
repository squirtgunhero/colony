import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/** @deprecated Use getResend() instead */
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    return (getResend() as Record<string | symbol, unknown>)[prop];
  },
});

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

