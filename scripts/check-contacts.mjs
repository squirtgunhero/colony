import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contacts = await prisma.contact.findMany({
    where: { name: { contains: 'john', mode: 'insensitive' } },
    take: 5,
    select: { id: true, name: true, tags: true, userId: true }
  });
  
  console.log("Contacts matching 'john':", JSON.stringify(contacts, null, 2));
  
  // Also show all contacts
  const allContacts = await prisma.contact.findMany({
    take: 10,
    select: { id: true, name: true, tags: true }
  });
  console.log("\nAll contacts (first 10):", JSON.stringify(allContacts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
