import { Resend } from "resend";

// Initialize Resend with API key from environment
export const resend = new Resend(process.env.RESEND_API_KEY);

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

