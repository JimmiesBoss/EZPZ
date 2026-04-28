import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const operatorEmail = process.env.OPERATOR_EMAIL;
  if (!operatorEmail) {
    console.log("OPERATOR_EMAIL not set; skipping operator seed.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: operatorEmail } });
  if (existing) {
    if (existing.role !== "OPERATOR") {
      await prisma.user.update({
        where: { email: operatorEmail },
        data: { role: "OPERATOR", isAdmin: true },
      });
      console.log(`Promoted ${operatorEmail} to OPERATOR.`);
    } else {
      console.log(`${operatorEmail} is already OPERATOR.`);
    }
  } else {
    await prisma.user.create({
      data: {
        email: operatorEmail,
        role: "OPERATOR",
        isAdmin: true,
      },
    });
    console.log(`Created placeholder OPERATOR user for ${operatorEmail}. They will be linked to OAuth on first sign-in.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
