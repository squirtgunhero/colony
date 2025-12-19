"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendGmailEmail } from "@/lib/gmail";

interface SendEmailData {
  to: string;
  subject: string;
  body: string;
  contactId?: string;
  emailAccountId?: string; // If provided, use connected Gmail account
}

export async function sendEmail(data: SendEmailData) {
  const { userId } = await auth();
  
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    let messageId: string | undefined;
    let fromEmail: string;

    if (data.emailAccountId) {
      // Send via Gmail
      const result = await sendGmailEmail({
        emailAccountId: data.emailAccountId,
        to: data.to,
        subject: data.subject,
        body: data.body,
      });
      
      messageId = result.messageId || undefined;
      
      // Get the email address for logging
      const account = await prisma.emailAccount.findUnique({
        where: { id: data.emailAccountId },
        select: { email: true },
      });
      fromEmail = account?.email || "unknown";
    } else {
      // Check if user has a default Gmail account
      const defaultAccount = await prisma.emailAccount.findFirst({
        where: { userId, isDefault: true },
      });

      if (defaultAccount) {
        // Use default Gmail account
        const result = await sendGmailEmail({
          emailAccountId: defaultAccount.id,
          to: data.to,
          subject: data.subject,
          body: data.body,
        });
        
        messageId = result.messageId || undefined;
        fromEmail = defaultAccount.email;
      } else {
        return { 
          success: false, 
          error: "No email account connected. Please connect your Gmail in Settings." 
        };
      }
    }

    // Log activity if contact provided
    if (data.contactId) {
      await prisma.activity.create({
        data: {
          type: "email",
          title: `Sent: ${data.subject}`,
          description: data.body.substring(0, 500),
          metadata: JSON.stringify({ 
            to: data.to, 
            from: fromEmail, 
            messageId,
            provider: "gmail",
          }),
          contactId: data.contactId,
        },
      });

      revalidatePath(`/contacts/${data.contactId}`);
    }

    revalidatePath("/dashboard");
    revalidatePath("/email");

    return { success: true, id: messageId };
  } catch (error) {
    console.error("Failed to send email:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send email";
    return { success: false, error: errorMessage };
  }
}

// Get user's connected email accounts for the email composer
export async function getUserEmailAccounts() {
  const { userId } = await auth();
  
  if (!userId) {
    return [];
  }

  return prisma.emailAccount.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      email: true,
      isDefault: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

interface SendPropertyListingEmailData {
  contactId: string;
  propertyIds: string[];
  subject?: string;
  message?: string;
  emailAccountId?: string;
}

export async function sendPropertyListingEmail(data: SendPropertyListingEmailData) {
  const { userId } = await auth();
  
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  // Get contact
  const contact = await prisma.contact.findUnique({
    where: { id: data.contactId },
    select: { id: true, name: true, email: true },
  });

  if (!contact?.email) {
    return { success: false, error: "Contact has no email" };
  }

  // Get properties
  const properties = await prisma.property.findMany({
    where: { id: { in: data.propertyIds } },
  });

  if (properties.length === 0) {
    return { success: false, error: "No properties selected" };
  }

  // Build email body
  const propertiesText = properties.map(p => 
    `${p.address}, ${p.city}${p.state ? `, ${p.state}` : ""} - $${p.price.toLocaleString()}${p.bedrooms ? ` | ${p.bedrooms} bed` : ""}${p.bathrooms ? ` ${p.bathrooms} bath` : ""}`
  ).join("\n\n");

  const emailBody = `Hi ${contact.name},

${data.message || "Here are some properties I thought you might be interested in:"}

${propertiesText}

Let me know if you'd like to schedule a showing for any of these properties!`;

  // Send the email
  return sendEmail({
    to: contact.email,
    subject: data.subject || `${properties.length} Properties for You`,
    body: emailBody,
    contactId: data.contactId,
    emailAccountId: data.emailAccountId,
  });
}
