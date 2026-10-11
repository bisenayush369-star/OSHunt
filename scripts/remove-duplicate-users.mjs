import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Add it to your environment before running this cleanup.");
    process.exit(1);
  }

  const duplicates = await prisma.$queryRawUnsafe(`
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY
            LOWER(COALESCE(email, '')),
            LOWER(COALESCE("githubUsername", ''))
          ORDER BY "createdAt" DESC
        ) AS rn
      FROM "User"
    )
    SELECT COUNT(*)::int AS count
    FROM ranked
    WHERE rn > 1;
  `);

  const count = Array.isArray(duplicates) ? Number(duplicates[0]?.count ?? 0) : 0;

  if (count === 0) {
    console.log("No duplicate users found.");
    return;
  }

  await prisma.$executeRawUnsafe(`
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY
            LOWER(COALESCE(email, '')),
            LOWER(COALESCE("githubUsername", ''))
          ORDER BY "createdAt" DESC
        ) AS rn
      FROM "User"
    )
    DELETE FROM "User" u
    USING ranked r
    WHERE u.id = r.id
      AND r.rn > 1;
  `);

  console.log(`Removed ${count} duplicate user rows.`);
}

main()
  .catch((error) => {
    console.error("Failed to remove duplicate users:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
