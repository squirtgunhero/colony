// ============================================================================
// LAM Seed Script
// Creates starter data for testing the LAM system
// Usage: npx tsx scripts/seed-lam.ts
// ============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Use a test user ID (replace with a real user ID from your auth system)
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  console.log("🌱 Seeding LAM test data...\n");

  // Clean existing test data
  console.log("Cleaning existing test data...");
  await prisma.lamChangeLog.deleteMany({});
  await prisma.lamIdempotencyKey.deleteMany({});
  await prisma.lamAction.deleteMany({});
  await prisma.lamRun.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.task.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.deal.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.contact.deleteMany({ where: { userId: TEST_USER_ID } });

  // Create 3 leads
  console.log("\n📋 Creating leads...");
  const leads = await Promise.all([
    prisma.contact.create({
      data: {
        userId: TEST_USER_ID,
        name: "Sarah Johnson",
        email: "sarah.johnson@example.com",
        phone: "+1-555-0101",
        type: "lead",
        source: "website",
        tags: ["buyer", "first-time"],
        notes: "Looking for a 3BR in downtown. Budget: $800K-$1M",
      },
    }),
    prisma.contact.create({
      data: {
        userId: TEST_USER_ID,
        name: "Michael Chen",
        email: "m.chen@techcorp.com",
        phone: "+1-555-0102",
        type: "lead",
        source: "referral",
        tags: ["buyer", "investor"],
        notes: "Interested in investment properties. Has purchased 2 properties before.",
      },
    }),
    prisma.contact.create({
      data: {
        userId: TEST_USER_ID,
        name: "Emily Rodriguez",
        email: "emily.r@gmail.com",
        phone: "+1-555-0103",
        type: "lead",
        source: "open_house",
        tags: ["seller"],
        notes: "Wants to list her condo. Moving to Texas for work.",
      },
    }),
  ]);

  console.log(`✓ Created ${leads.length} leads:`);
  leads.forEach((l) => console.log(`  - ${l.name} (${l.id})`));

  // Create 2 deals across 2 stages
  console.log("\n💰 Creating deals...");
  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        userId: TEST_USER_ID,
        title: "Sarah Johnson - Downtown Condo",
        stage: "showing",
        value: 850000,
        contactId: leads[0].id,
        notes: "Showing 3 properties this Saturday",
        expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      },
    }),
    prisma.deal.create({
      data: {
        userId: TEST_USER_ID,
        title: "Michael Chen - Investment Property",
        stage: "qualified",
        value: 450000,
        contactId: leads[1].id,
        notes: "Looking at 2-4 unit properties",
        expectedCloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    }),
  ]);

  console.log(`✓ Created ${deals.length} deals:`);
  deals.forEach((d) => console.log(`  - ${d.title} (${d.stage}) - $${d.value?.toLocaleString()}`));

  // Create 2 tasks
  console.log("\n✅ Creating tasks...");
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        userId: TEST_USER_ID,
        title: "Schedule showing for Sarah Johnson",
        description: "Confirm 3 property showings for Saturday at 10am, 12pm, 2pm",
        priority: "high",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        contactId: leads[0].id,
        dealId: deals[0].id,
        completed: false,
      },
    }),
    prisma.task.create({
      data: {
        userId: TEST_USER_ID,
        title: "Send investment property analysis to Michael",
        description: "Prepare ROI analysis for the 3 shortlisted properties",
        priority: "medium",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
        contactId: leads[1].id,
        dealId: deals[1].id,
        completed: false,
      },
    }),
  ]);

  console.log(`✓ Created ${tasks.length} tasks:`);
  tasks.forEach((t) => console.log(`  - ${t.title} (${t.priority})`));

  // Create a note
  console.log("\n📝 Creating notes...");
  const notes = await Promise.all([
    prisma.note.create({
      data: {
        userId: TEST_USER_ID,
        body: "Initial call went great. Sarah is very motivated to buy within the next 2 months.",
        contactId: leads[0].id,
      },
    }),
  ]);

  console.log(`✓ Created ${notes.length} notes`);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 Seed complete! Test data created:");
  console.log("=".repeat(50));
  console.log(`\nLeads: ${leads.length}`);
  console.log(`Deals: ${deals.length}`);
  console.log(`Tasks: ${tasks.length}`);
  console.log(`Notes: ${notes.length}`);
  console.log(`\nTest User ID: ${TEST_USER_ID}`);
  console.log("\nYou can now test the LAM API with these entities.");
  console.log("\nExample curl commands:");
  console.log(`
# Create a new lead
curl -X POST http://localhost:3000/api/lam/run \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Create a new lead named John Smith with email john@example.com"}'

# Search for leads
curl -X POST http://localhost:3000/api/lam/run \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Find all leads with Sarah in their name"}'

# Update a deal stage
curl -X POST http://localhost:3000/api/lam/run \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Move the Sarah Johnson deal to the offer stage"}'

# Undo last action
curl -X POST http://localhost:3000/api/lam/undo \\
  -H "Content-Type: application/json" \\
  -d '{}'
`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

