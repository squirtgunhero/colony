// Pre-built email templates for common real estate scenarios

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "follow-up" | "listing" | "meeting" | "general";
}

export const emailTemplates: EmailTemplate[] = [
  // Follow-up templates
  {
    id: "initial-follow-up",
    name: "Initial Follow-Up",
    category: "follow-up",
    subject: "Great connecting with you!",
    body: `Hi {{contactName}},

It was great connecting with you! I wanted to follow up and see if you have any questions about the properties we discussed.

I'm here to help you find your perfect home. Feel free to reach out anytime - I'm always happy to chat.

Looking forward to hearing from you!

Best regards`,
  },
  {
    id: "post-showing",
    name: "After Property Showing",
    category: "follow-up",
    subject: "Thank you for visiting {{propertyAddress}}",
    body: `Hi {{contactName}},

Thank you for taking the time to view the property today! I hope you enjoyed the showing.

I'd love to hear your thoughts on the property. What did you think? Is there anything specific you'd like to know more about?

If you're interested in scheduling another viewing or have any questions, please don't hesitate to reach out.

Best regards`,
  },
  {
    id: "check-in",
    name: "General Check-In",
    category: "follow-up",
    subject: "Checking in - How's your home search going?",
    body: `Hi {{contactName}},

I hope this message finds you well! I wanted to check in and see how your property search is going.

Have your needs or preferences changed since we last spoke? I've come across some new listings that might interest you.

Let me know if you'd like to schedule a time to catch up or if there's anything I can help with.

Best regards`,
  },
  // Listing templates
  {
    id: "new-listing",
    name: "New Listing Alert",
    category: "listing",
    subject: "🏠 New Property Just Listed!",
    body: `Hi {{contactName}},

I'm excited to share a new listing that just hit the market and immediately made me think of you!

Based on what you're looking for, I think this property could be a great fit. Here are the highlights:

[Property details will be added here]

Would you like to schedule a showing? These properties tend to move quickly, so let me know as soon as possible if you're interested.

Best regards`,
  },
  {
    id: "price-reduction",
    name: "Price Reduction Alert",
    category: "listing",
    subject: "Price Drop Alert: Property You Might Like",
    body: `Hi {{contactName}},

Great news! A property that matches your criteria just had a price reduction.

This could be a great opportunity to get into a home you love at a better price point. Would you like to take another look?

Let me know if you'd like to schedule a showing or have any questions.

Best regards`,
  },
  {
    id: "market-update",
    name: "Market Update",
    category: "listing",
    subject: "Your Monthly Market Update",
    body: `Hi {{contactName}},

I wanted to share a quick update on the local real estate market:

• Average home prices: [update]
• Days on market: [update]  
• New listings this month: [update]

If you're thinking about buying or selling, now could be a great time to discuss your options. I'm happy to provide a more detailed analysis for your specific situation.

Best regards`,
  },
  // Meeting templates
  {
    id: "meeting-confirmation",
    name: "Meeting Confirmation",
    category: "meeting",
    subject: "Confirmed: Our meeting on {{date}}",
    body: `Hi {{contactName}},

This is a quick note to confirm our meeting scheduled for {{date}}.

Meeting Details:
• Date: {{date}}
• Time: {{time}}
• Location: {{location}}

Please let me know if you need to reschedule or have any questions before we meet.

Looking forward to seeing you!

Best regards`,
  },
  {
    id: "meeting-reminder",
    name: "Meeting Reminder",
    category: "meeting",
    subject: "Reminder: We're meeting tomorrow!",
    body: `Hi {{contactName}},

Just a friendly reminder about our meeting tomorrow!

I'm looking forward to our conversation. If anything has come up and you need to reschedule, please let me know as soon as possible.

See you soon!

Best regards`,
  },
  // General templates
  {
    id: "thank-you",
    name: "Thank You",
    category: "general",
    subject: "Thank you!",
    body: `Hi {{contactName}},

I just wanted to take a moment to thank you for your time and trust.

It's been a pleasure working with you, and I truly appreciate the opportunity to help with your real estate needs.

If there's ever anything I can do for you in the future, please don't hesitate to reach out. I'm always here to help!

Best regards`,
  },
  {
    id: "referral-request",
    name: "Referral Request",
    category: "general",
    subject: "Quick favor?",
    body: `Hi {{contactName}},

I hope you're doing well! I really enjoyed working with you and hope you're loving your new home.

If you know anyone who might be looking to buy or sell a home, I'd be grateful if you'd pass along my information. Referrals are the biggest compliment I can receive!

Thank you again for your trust, and please don't hesitate to reach out if you ever need anything.

Best regards`,
  },
];

export function getTemplatesByCategory(category: EmailTemplate["category"]) {
  return emailTemplates.filter((t) => t.category === category);
}

export function getTemplateById(id: string) {
  return emailTemplates.find((t) => t.id === id);
}

export function fillTemplate(template: string, variables: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(variables)) {
    filled = filled.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return filled;
}

