import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const name = "Temple of Literature & National University";
  
  console.log(`Updating category of "${name}" back to "Heritage & History"...`);

  const updated = await prisma.place.update({
    where: { name },
    data: {
      category: "Heritage & History"
    }
  });

  console.log(`Successfully updated category for "${updated.name}" to "${updated.category}".`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
