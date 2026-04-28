import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const prisma = new PrismaClient();
const SECRET = process.env.NEXTAUTH_SECRET || "dev";

async function ensureUser(email: string, role: "BUYER" | "OPERATOR") {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== role) {
      await prisma.user.update({ where: { email }, data: { role } });
    }
    return existing;
  }
  return prisma.user.create({
    data: { email, role, name: email.split("@")[0], googleId: `seed-${email}` },
  });
}

async function mintCookie(userId: string, email: string, role: "BUYER" | "OPERATOR") {
  const token = await encode({
    secret: SECRET,
    token: {
      id: userId,
      email,
      role,
      isAdmin: false,
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    },
  });
  return `next-auth.session-token=${token}`;
}

async function main() {
  const buyer = await ensureUser("buyer@widgeter.test", "BUYER");
  const operator = await ensureUser("operator@widgeter.test", "OPERATOR");
  const buyerCookie = await mintCookie(buyer.id, buyer.email, "BUYER");
  const operatorCookie = await mintCookie(operator.id, operator.email, "OPERATOR");
  console.log(JSON.stringify({ buyerId: buyer.id, operatorId: operator.id, buyerCookie, operatorCookie }));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
